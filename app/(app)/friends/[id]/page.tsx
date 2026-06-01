import { Suspense } from "react";
import { getFriend, getFriendLedger } from "../actions";
import { FriendLedger } from "./friend-ledger";
import { FriendLedgerSkeleton } from "./friend-ledger-skeleton";

async function FriendLedgerContent({
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

export default function FriendDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<FriendLedgerSkeleton />}>
      <FriendLedgerContent params={params} />
    </Suspense>
  );
}
