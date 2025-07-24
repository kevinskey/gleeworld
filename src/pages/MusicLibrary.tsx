import { LibraryManagement } from "@/components/music-library/LibraryManagement";
import { MusicLibraryHeader } from "@/components/music-library/MusicLibraryHeader";

const MusicLibraryPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <MusicLibraryHeader />
      <main>
        <LibraryManagement />
      </main>
    </div>
  );
};

export default MusicLibraryPage;