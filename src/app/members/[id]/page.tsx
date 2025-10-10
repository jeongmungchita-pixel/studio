import MemberProfileClient from './member-profile-client';

// This is a Server Component by default
export default function MemberProfilePage({ params }: { params: { id: string } }) {
  const { id } = params;

  // We pass the id down to the Client Component
  return <MemberProfileClient id={id} />;
}
