import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ConversationListItem } from '@/components/messaging/ConversationListItem';
import { GroupHeader } from '@/components/messaging/GroupHeader';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { MessageSquare, Plus, User, X, Search, FolderPlus, Folder, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import useGroupMessages from '@/hooks/useGroupMessages';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core';

interface User {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  voice_part?: string;
}

// Draggable wrapper for groups
const DraggableGroup: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
      {children}
    </div>
  );
};

// Droppable wrapper for folders
const DroppableFolder: React.FC<{ id: string; children: React.ReactNode; isOver?: boolean }> = ({ id, children }) => {
  const { isOver, setNodeRef } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`border-b border-border/30 transition-colors ${isOver ? 'bg-primary/10' : ''}`}
    >
      {children}
    </div>
  );
};

export const GroupMessageInterface: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const [conversationType, setConversationType] = useState<'group' | 'direct'>('group');
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string } | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    conversations,
    folders,
    messages,
    loading,
    fetchMessagesForConversation,
    sendMessage,
    markConversationAsRead,
    deleteGroup,
    updateGroup,
    createFolder,
    updateFolder,
    deleteFolder,
    moveGroupToFolder
  } = useGroupMessages();

  const {
    conversations: dmConversations,
    messages: dmMessages,
    sendMessage: sendDirectMessage,
    createConversation,
    fetchMessages: fetchDirectMessages
  } = useDirectMessages();

  const allConversations = conversationType === 'group' ? conversations : dmConversations;
  const selectedConversation = allConversations.find(c => c.id === selectedConversationId);
  const conversationMessages = selectedConversationId 
    ? (conversationType === 'group' ? messages[selectedConversationId] : dmMessages[selectedConversationId]) || []
    : [];

  useEffect(() => {
    if (allConversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(allConversations[0].id);
    }
  }, [allConversations, selectedConversationId]);

  const handleSelectConversation = async (conversation: any, type: 'group' | 'direct') => {
    setConversationType(type);
    setSelectedConversationId(conversation.id);
    
    // Fetch messages when selecting a direct message conversation
    if (type === 'direct') {
      await fetchDirectMessages(conversation.id);
    }
  };

  const handleBackToList = () => {
    setShowMessages(false);
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedConversationId || !user) return;

    try {
      if (conversationType === 'group') {
        await sendMessage(selectedConversationId, message);
        toast({
          title: 'Message Sent',
          description: 'Your message has been delivered.',
        });
      } else {
        await sendDirectMessage(selectedConversationId, message);
        toast({
          title: 'Message Sent',
          description: 'Your direct message has been sent.',
        });
      }
    } catch (error: any) {
      console.error('Send message error:', error);
      toast({
        title: 'Send Failed',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Are you sure you want to delete "${groupName}"?`)) return;
    
    try {
      await deleteGroup(groupId);
      if (selectedConversationId === groupId) {
        setSelectedConversationId(null);
      }
      toast({
        title: 'Group Deleted',
        description: `"${groupName}" has been removed.`,
      });
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete group. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleEditGroup = (groupId: string, groupName: string) => {
    setEditingGroup({ id: groupId, name: groupName });
    setEditGroupName(groupName);
    setEditGroupOpen(true);
  };

  const handleSaveEditGroup = async () => {
    if (!editingGroup || !editGroupName.trim()) return;
    
    try {
      await updateGroup(editingGroup.id, editGroupName.trim());
      setEditGroupOpen(false);
      setEditingGroup(null);
      toast({
        title: 'Group Updated',
        description: 'Group name has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update group. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName.trim());
      setNewFolderOpen(false);
      setNewFolderName('');
      toast({ title: 'Folder Created', description: 'New folder has been created.' });
    } catch (error) {
      toast({ title: 'Create Failed', description: 'Failed to create folder.', variant: 'destructive' });
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!confirm(`Delete folder "${folderName}"? Groups will be moved to root.`)) return;
    try {
      await deleteFolder(folderId);
      toast({ title: 'Folder Deleted', description: 'Folder has been removed.' });
    } catch (error) {
      toast({ title: 'Delete Failed', description: 'Failed to delete folder.', variant: 'destructive' });
    }
  };

  const handleMoveToFolder = async (groupId: string, folderId: string | null) => {
    try {
      await moveGroupToFolder(groupId, folderId);
      toast({ title: 'Group Moved', description: 'Group has been moved.' });
    } catch (error) {
      toast({ title: 'Move Failed', description: 'Failed to move group.', variant: 'destructive' });
    }
  };

  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveGroupId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveGroupId(null);
    
    if (!over) return;
    
    const groupId = active.id as string;
    const targetId = over.id as string;
    
    // Check if dropped on a folder or "no-folder" zone
    if (targetId === 'no-folder') {
      handleMoveToFolder(groupId, null);
    } else if (folders.some(f => f.id === targetId)) {
      handleMoveToFolder(groupId, targetId);
    }
  };

  const handleSearchChange = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim() || !user) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, avatar_url, voice_part')
        .neq('user_id', user.id)
        .ilike('full_name', `%${query}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    }
  };

  const handleUserSelect = async (selectedUser: User) => {
    const conversationId = await createConversation(selectedUser.user_id);
    if (conversationId) {
      setConversationType('direct');
      setSelectedConversationId(conversationId);
      setNewMessageOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      
      // Fetch messages for the new/existing conversation
      await fetchDirectMessages(conversationId);
      
      if (isMobile) {
        setShowMessages(true);
      }
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="h-full flex flex-col bg-muted/30 overflow-hidden max-w-5xl mx-auto">
      {/* Mobile: Single column with groups at top */}
      {isMobile ? (
        <>
          {/* Group List - Compact horizontal scroll at top */}
          <div className="flex-shrink-0 bg-muted/50 border-b border-border">
            <div className="bg-[hsl(var(--message-header))] text-white px-2 py-1.5 shadow-sm flex items-center justify-between">
              <h2 className="text-xs font-semibold">Conversations</h2>
              <Dialog open={newMessageOpen} onOpenChange={setNewMessageOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 h-6 px-2 text-[10px]">
                    <Plus className="h-3 w-3 mr-1" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md w-[92vw] sm:w-auto h-[80vh] max-h-[80vh] flex flex-col p-6">
                  <DialogHeader className="mb-4">
                    <DialogTitle>New Direct Message</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Type member name..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-9"
                        autoFocus
                      />
                    </div>

                    <ScrollArea className="max-h-[50vh] h-[50vh] -mr-3 pr-3 overscroll-contain touch-pan-y">
                      {searchResults.length > 0 && (
                        <div className="space-y-1 py-1">
                          {searchResults.map((user) => {
                            const initials = user.full_name
                              .split(' ')
                              .map(n => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2);
                            
                            return (
                              <button
                                key={user.user_id}
                                onClick={() => handleUserSelect(user)}
                                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors text-left"
                              >
                                <Avatar className="h-10 w-10 flex-shrink-0">
                                  <AvatarImage src={user.avatar_url} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-foreground text-sm truncate">
                                    {user.full_name}
                                  </div>
                                  {user.voice_part && (
                                    <div className="text-xs text-muted-foreground">
                                      {user.voice_part}
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {searchQuery && searchResults.length === 0 && (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          No members found
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Horizontal scrollable groups */}
            <div className="w-full bg-background overflow-x-auto">
              <div className="flex gap-2 p-2">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation, 'group')}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selectedConversationId === conversation.id && conversationType === 'group'
                        ? 'bg-[hsl(var(--message-header))] text-white'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    {conversation.name}
                    {conversation.unread_count > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-destructive text-white rounded-full text-[10px]">
                        {conversation.unread_count}
                      </span>
                    )}
                  </button>
                ))}
                {dmConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation, 'direct')}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selectedConversationId === conversation.id && conversationType === 'direct'
                        ? 'bg-[hsl(var(--message-header))] text-white'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    <User className="h-3 w-3 inline mr-1" />
                    {conversation.other_user_name}
                    {conversation.unread_count > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-destructive text-white rounded-full text-[10px]">
                        {conversation.unread_count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Messages and Input - Takes remaining space */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Group Header for mobile */}
                <div className="flex-shrink-0">
                  <GroupHeader
                    groupId={(selectedConversation as any).id}
                    groupName={conversationType === 'group' ? (selectedConversation as any).name : (selectedConversation as any).other_user_name}
                    onBack={handleBackToList}
                    showBackButton={false}
                  />
                </div>
                
                {/* Messages Area */}
                <ScrollArea className="flex-1 px-2 bg-muted/20 overflow-y-auto">
                  {conversationMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-6 px-3">
                      <div className="w-12 h-12 rounded-full bg-[hsl(var(--message-header))]/10 flex items-center justify-center mb-2">
                        <MessageSquare className="h-6 w-6 text-[hsl(var(--message-header))]" />
                      </div>
                      <h3 className="text-sm font-medium text-foreground mb-1.5">No messages yet</h3>
                      <p className="text-[11px] text-muted-foreground max-w-xs">
                        {conversationType === 'group' 
                          ? `Start messaging ${(selectedConversation as any).name}`
                          : `Start messaging ${(selectedConversation as any).other_user_name}`
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="py-2">
                      {conversationMessages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input - Fixed at bottom */}
                <div className="border-t border-border p-2 bg-background flex-shrink-0 safe-bottom">
                  <MessageInput 
                    onSendMessage={handleSendMessage} 
                    groupId={conversationType === 'group' ? selectedConversationId || undefined : undefined}
                    onPollCreated={() => selectedConversationId && fetchMessagesForConversation(selectedConversationId)}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-background p-4">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[hsl(var(--message-header))]/10 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="h-8 w-8 text-[hsl(var(--message-header))]" />
                  </div>
                  <h3 className="text-base font-medium text-foreground">Select a conversation</h3>
                  <p className="text-xs text-muted-foreground mt-2">Choose a group above to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Desktop: Two-column layout */
        <div className="h-full flex gap-0">
          {/* Conversation List Sidebar */}
          <div className="flex w-[240px] lg:w-[280px] xl:w-[300px] border-r border-border flex-col bg-muted/50">
            <div className="h-full flex flex-col">
              <div className="bg-[hsl(var(--message-header))] text-white px-3 py-2.5 shadow-md flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" />
                    Messages
                  </h2>
                  <Dialog open={newMessageOpen} onOpenChange={setNewMessageOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 h-8 px-2 text-xs">
                        <Plus className="h-3 w-3 mr-1" />
                        New
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md w-[92vw] sm:w-auto h-[80vh] max-h-[80vh] flex flex-col p-6">
                      <DialogHeader className="mb-4">
                        <DialogTitle>New Direct Message</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="text"
                            placeholder="Type member name..."
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-9"
                            autoFocus
                          />
                        </div>

                        <ScrollArea className="max-h-[50vh] h-[50vh] -mr-3 pr-3 overscroll-contain touch-pan-y">
                          {searchResults.length > 0 && (
                            <div className="space-y-1 py-1">
                              {searchResults.map((user) => {
                                const initials = user.full_name
                                  .split(' ')
                                  .map(n => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2);
                                
                                return (
                                  <button
                                    key={user.user_id}
                                    onClick={() => handleUserSelect(user)}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors text-left"
                                  >
                                    <Avatar className="h-10 w-10 flex-shrink-0">
                                      <AvatarImage src={user.avatar_url} />
                                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                        {initials}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-foreground text-sm truncate">
                                        {user.full_name}
                                      </div>
                                      {user.voice_part && (
                                        <div className="text-xs text-muted-foreground">
                                          {user.voice_part}
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {searchQuery && searchResults.length === 0 && (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                              No members found
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <ScrollArea className="flex-1 bg-background">
                <div className="min-w-0">
                  {/* Groups Header with New Folder button */}
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase bg-muted/30 flex items-center justify-between">
                    <span>Groups</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-5 px-1.5 text-[10px]"
                      onClick={() => setNewFolderOpen(true)}
                    >
                      <FolderPlus className="h-3 w-3 mr-2" />
                      Folder
                    </Button>
                  </div>

                  <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    {/* Folders with groups */}
                    {folders.map(folder => {
                      const folderGroups = conversations.filter(c => c.folder_id === folder.id);
                      const isCollapsed = collapsedFolders.has(folder.id);
                      
                      return (
                        <DroppableFolder key={folder.id} id={folder.id} isOver={false}>
                          <div 
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 group"
                            onClick={() => toggleFolderCollapse(folder.id)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              if (confirm(`Delete folder "${folder.name}"?`)) {
                                handleDeleteFolder(folder.id, folder.name);
                              }
                            }}
                          >
                            {isCollapsed ? (
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            )}
                            <Folder className="h-4 w-4" style={{ color: folder.color }} />
                            <span className="text-sm md:text-lg font-medium flex-1">{folder.name}</span>
                            <span className="text-[10px] text-muted-foreground">{folderGroups.length}</span>
                          </div>
                          {!isCollapsed && folderGroups.map(conversation => (
                            <DraggableGroup key={conversation.id} id={conversation.id}>
                              <div className="pl-6">
                                <ConversationListItem
                                  name={conversation.name}
                                  lastMessage={messages[conversation.id]?.[0]?.message_body}
                                  timestamp={messages[conversation.id]?.[0]?.created_at}
                                  unreadCount={conversation.unread_count}
                                  isSelected={selectedConversationId === conversation.id && conversationType === 'group'}
                                  onClick={() => handleSelectConversation(conversation, 'group')}
                                  onEdit={() => handleEditGroup(conversation.id, conversation.name)}
                                  onDelete={() => handleDeleteGroup(conversation.id, conversation.name)}
                                  folders={folders.map(f => ({ id: f.id, name: f.name }))}
                                  currentFolderId={conversation.folder_id}
                                  onMoveToFolder={(folderId) => handleMoveToFolder(conversation.id, folderId)}
                                />
                              </div>
                            </DraggableGroup>
                          ))}
                        </DroppableFolder>
                      );
                    })}

                    {/* Ungrouped conversations (no folder) - also a drop zone */}
                    <DroppableFolder id="no-folder" isOver={false}>
                      {conversations.filter(c => !c.folder_id).length > 0 && (
                        <div className="py-1">
                          {conversations.filter(c => !c.folder_id).map((conversation) => (
                            <DraggableGroup key={conversation.id} id={conversation.id}>
                              <ConversationListItem
                                name={conversation.name}
                                lastMessage={messages[conversation.id]?.[0]?.message_body}
                                timestamp={messages[conversation.id]?.[0]?.created_at}
                                unreadCount={conversation.unread_count}
                                isSelected={selectedConversationId === conversation.id && conversationType === 'group'}
                                onClick={() => handleSelectConversation(conversation, 'group')}
                                onEdit={() => handleEditGroup(conversation.id, conversation.name)}
                                onDelete={() => handleDeleteGroup(conversation.id, conversation.name)}
                                folders={folders.map(f => ({ id: f.id, name: f.name }))}
                                currentFolderId={conversation.folder_id}
                                onMoveToFolder={(folderId) => handleMoveToFolder(conversation.id, folderId)}
                              />
                            </DraggableGroup>
                          ))}
                        </div>
                      )}
                    </DroppableFolder>

                    {/* Drag overlay */}
                    <DragOverlay>
                      {activeGroupId ? (
                        <div className="bg-background border border-primary rounded-md shadow-lg p-2 opacity-90">
                          <span className="text-xs font-medium">
                            {conversations.find(c => c.id === activeGroupId)?.name}
                          </span>
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                  
                  {dmConversations.length > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase bg-muted/30">Direct Messages</div>
                      {dmConversations.map((conversation) => (
                        <ConversationListItem
                          key={conversation.id}
                          name={conversation.other_user_name}
                          lastMessage={dmMessages[conversation.id]?.[0]?.content}
                          timestamp={dmMessages[conversation.id]?.[0]?.created_at}
                          unreadCount={conversation.unread_count}
                          isSelected={selectedConversationId === conversation.id && conversationType === 'direct'}
                          onClick={() => handleSelectConversation(conversation, 'direct')}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Messages View */}
          <div className="flex flex-1 min-w-0 flex-col bg-background">
            {selectedConversation ? (
              <div className="h-full flex flex-col">
                <div className="flex-shrink-0">
                  <GroupHeader
                    groupId={(selectedConversation as any).id}
                    groupName={conversationType === 'group' ? (selectedConversation as any).name : (selectedConversation as any).other_user_name}
                    onBack={handleBackToList}
                    showBackButton={false}
                  />
                </div>

                <ScrollArea className="flex-1 px-3 bg-muted/20 overflow-y-auto">
                  {conversationMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-6 px-3">
                      <div className="w-14 h-14 rounded-full bg-[hsl(var(--message-header))]/10 flex items-center justify-center mb-3">
                        <MessageSquare className="h-7 w-7 text-[hsl(var(--message-header))]" />
                      </div>
                      <h3 className="text-base font-medium text-foreground mb-1.5">No messages yet</h3>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        {conversationType === 'group' 
                          ? `Click below to start messaging ${(selectedConversation as any).name}`
                          : `Click below to start messaging ${(selectedConversation as any).other_user_name}`
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="py-2">
                      {conversationMessages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                <div className="border-t border-border p-2 bg-background flex-shrink-0">
                  <MessageInput 
                    onSendMessage={handleSendMessage} 
                    groupId={conversationType === 'group' ? selectedConversationId || undefined : undefined}
                    onPollCreated={() => selectedConversationId && fetchMessagesForConversation(selectedConversationId)}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-background p-4">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-[hsl(var(--message-header))]/10 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="h-10 w-10 text-[hsl(var(--message-header))]" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground">Select a conversation</h3>
                  <p className="text-sm text-muted-foreground mt-2">Choose a group to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Group Dialog */}
      <Dialog open={editGroupOpen} onOpenChange={setEditGroupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Group Name</label>
              <Input
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditGroupOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEditGroup}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateFolder}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupMessageInterface;