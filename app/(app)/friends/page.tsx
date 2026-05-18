import { getFriends } from "./actions";
import { FriendList } from "./friend-list";

export default async function FriendsPage() {
  const friends = await getFriends();
  return <FriendList friends={friends} />;
}
