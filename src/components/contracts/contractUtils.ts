
export const getStatusColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-green-100 text-green-800";
    case "pending_admin_signature": return "bg-yellow-100 text-yellow-800";
    case "pending_recipient": return "bg-orange-100 text-orange-800";
    case "pending_sender": return "bg-red-100 text-red-800";
    case "draft": return "bg-gray-100 text-gray-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

export const getStatusText = (status: string) => {
  switch (status) {
    case "completed": return "Completed";
    case "pending_admin_signature": return "Pending Admin Signature";
    case "pending_recipient": return "Pending Recipient";
    case "pending_sender": return "Pending Your Signature";
    case "draft": return "Draft";
    default: return "Unknown";
  }
};
