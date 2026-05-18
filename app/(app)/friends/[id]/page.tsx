import { getFriend, getFriendLedger } from "../actions";
import { FriendLedger } from "./friend-ledger";

export default async function FriendDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [friend, ledger] = await Promise.all([
    getFriend(id),
    getFriendLedger(id),
  ]);

  return <FriendLedger friend={friend} ledger={ledger} />;
}
