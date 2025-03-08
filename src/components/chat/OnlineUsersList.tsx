import { OnlineUser } from '@/types/chat';

interface OnlineUsersListProps {
  onlineUsers: OnlineUser[];
  onUserSelect: (userId: string, username: string) => void;
}

export const OnlineUsersList = ({ onlineUsers, onUserSelect }: OnlineUsersListProps) => {
  return (
    <div className="p-4 border-b bg-gray-50">
      <h3 className="text-sm font-medium text-gray-500 mb-2">Online Users</h3>
      <div className="flex flex-wrap gap-2">
        {onlineUsers.map((onlineUser) => (
          <button
            key={onlineUser.id}
            onClick={() => onUserSelect(onlineUser.id, onlineUser.username)}
            className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-sm"
          >
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            {onlineUser.username}
          </button>
        ))}
        {onlineUsers.length === 0 && (
          <p className="text-sm text-gray-500">No users online</p>
        )}
      </div>
    </div>
  );
};