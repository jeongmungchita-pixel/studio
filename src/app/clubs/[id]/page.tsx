import ClubDetailsClient from './club-details-client';

// This is a Server Component by default
export default function ClubDetailsPage({ params }: { params: { id: string } }) {
  const { id } = params;

  // We pass the id down to the Client Component
  return <ClubDetailsClient id={id} />;
}
