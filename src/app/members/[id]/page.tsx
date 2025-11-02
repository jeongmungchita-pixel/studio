import MemberProfileClient from './member-profile-client';
// This is a Server Component by default
export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // We pass the id down to the Client Component
  return <MemberProfileClient id={id} />;
}
