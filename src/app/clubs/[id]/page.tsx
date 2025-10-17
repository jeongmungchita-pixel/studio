import ClubDetailsClient from './club-details-client';

// This is a Server Component by default
export default async function ClubDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // We pass the id down to the Client Component
  return <ClubDetailsClient id={id} />;
}
