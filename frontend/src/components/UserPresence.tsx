import { useEffect, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';
import { Users } from 'lucide-react';

interface User {
  name: string;
  color: string;
}

interface Props {
  provider: WebsocketProvider | null;
}

export default function UserPresence({ provider }: Props) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!provider) return;

    const updateUsers = () => {
      const states = provider.awareness.getStates();
      const userList: User[] = [];
      
      states.forEach((state) => {
        if (state.user) {
          userList.push(state.user);
        }
      });
      
      setUsers(userList);
    };

    updateUsers();
    provider.awareness.on('change', updateUsers);

    return () => {
      provider.awareness.off('change', updateUsers);
    };
  }, [provider]);

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-800 text-white">
      <Users size={16} />
      <span className="text-sm">Online: {users.length}</span>
      <div className="flex gap-1">
        {users.map((user, index) => (
          <div
            key={index}
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
    </div>
  );
} 