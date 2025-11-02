/**
 * Migration Script: Add status field to all clubs
 * 
 * This script adds 'status: approved' to all existing clubs
 * that don't have a status field.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function migrateClubsStatus() {
  console.log('🚀 Starting clubs status migration...\n');

  try {
    // Get all clubs
    const clubsSnapshot = await db.collection('clubs').get();
    
    if (clubsSnapshot.empty) {
      console.log('❌ No clubs found in database');
      return;
    }

    console.log(`📊 Found ${clubsSnapshot.size} clubs\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Update each club
    const batch = db.batch();
    
    clubsSnapshot.forEach((doc) => {
      const data = doc.data();
      
      if (!data.status) {
        console.log(`✅ Adding status to club: ${data.name} (${doc.id})`);
        batch.update(doc.ref, {
          status: 'approved',
          approvedAt: data.approvedAt || new Date().toISOString(),
        });
        updatedCount++;
      } else {
        console.log(`⏭️  Skipping club: ${data.name} (already has status: ${data.status})`);
        skippedCount++;
      }
    });

    // Commit the batch
    await batch.commit();

    console.log('\n✨ Migration completed!');
    console.log(`   Updated: ${updatedCount} clubs`);
    console.log(`   Skipped: ${skippedCount} clubs`);
    
  } catch (error: unknown) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateClubsStatus()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
