/**
 * Script to generate 10,000 post records for testing
 * 
 * Usage:
 *   node scripts/generate_posts.js
 * 
 * Make sure your Supabase credentials are configured in backend/config/supabase.js
 */

const supabase = require('../backend/config/supabase');

// Sample post content templates
const postContents = [
  "Had an amazing Jain community gathering today! 🙏",
  "Sharing some delicious vegetarian recipes from our community kitchen.",
  "Beautiful Jain temple visit this weekend. Blessed to be part of this community!",
  "Looking for recommendations for Jain-friendly restaurants in the area.",
  "Community service event was a huge success! Thank you everyone who participated.",
  "Sharing some thoughts on Jain philosophy and daily practice.",
  "Great to see so many young Jains actively participating in community events!",
  "Vegetarian food festival was amazing! So many delicious options.",
  "Community meditation session was peaceful and rejuvenating.",
  "Looking forward to the upcoming Jain festival celebrations!",
  "Sharing some beautiful Jain artwork I came across recently.",
  "Community book club meeting was insightful. Great discussions!",
  "Jain principles in daily life - sharing my experiences.",
  "Amazing to see the Jain community growing stronger every day!",
  "Vegetarian cooking tips from our community elders.",
  "Community charity drive was successful. Proud of everyone's contribution!",
  "Jain temple architecture is truly magnificent.",
  "Sharing some inspiring quotes from Jain scriptures.",
  "Community yoga session was refreshing!",
  "Great to connect with fellow Jains at the community center.",
  "Vegetarian recipes passed down through generations.",
  "Community garden project is coming along beautifully!",
  "Jain values and modern life - finding the balance.",
  "Community support during difficult times means everything.",
  "Sharing some beautiful moments from our community celebrations.",
  "Jain philosophy has taught me so much about compassion.",
  "Community elders sharing wisdom and life experiences.",
  "Vegetarian food is not just a diet, it's a way of life.",
  "Community service brings us all closer together.",
  "Jain festivals are always filled with joy and togetherness.",
  "Sharing some meditation techniques from Jain tradition.",
  "Community library has amazing collection of Jain literature.",
  "Vegetarian cooking class was fun and educational!",
  "Community youth group activities are always engaging.",
  "Jain principles guide my daily decisions.",
  "Community support network is invaluable.",
  "Sharing some beautiful Jain poetry.",
  "Community health and wellness program is beneficial for all.",
  "Jain values of non-violence resonate deeply.",
  "Community cultural events showcase our rich heritage.",
  "Vegetarian food options in our area are expanding!",
  "Community elders are a treasure trove of knowledge.",
  "Jain meditation practices help maintain inner peace.",
  "Community charity work makes a real difference.",
  "Sharing some thoughts on Jain ethics and morality.",
  "Community gatherings strengthen our bonds.",
  "Jain festivals bring families together.",
  "Community education programs are enriching.",
  "Vegetarian lifestyle is sustainable and healthy.",
  "Community support during festivals is heartwarming."
];

// Sample locations (Indian cities with Jain communities)
const locations = [
  "Mumbai, Maharashtra",
  "Delhi, NCR",
  "Ahmedabad, Gujarat",
  "Jaipur, Rajasthan",
  "Surat, Gujarat",
  "Pune, Maharashtra",
  "Bangalore, Karnataka",
  "Kolkata, West Bengal",
  "Chennai, Tamil Nadu",
  "Hyderabad, Telangana",
  "Indore, Madhya Pradesh",
  "Nagpur, Maharashtra",
  "Vadodara, Gujarat",
  "Rajkot, Gujarat",
  "Bhopal, Madhya Pradesh",
  "Patna, Bihar",
  "Lucknow, Uttar Pradesh",
  "Kanpur, Uttar Pradesh",
  "Agra, Uttar Pradesh",
  "Varanasi, Uttar Pradesh"
];

// Sample image URLs (placeholder images - you can replace with actual image URLs)
const sampleImageUrls = [
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800",
  "https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800",
  "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800",
  null, // Some posts without images
  null,
  null,
  null,
  null,
  null
];

// Generate random date within last 6 months
function getRandomDate() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));
  const randomTime = sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime());
  return new Date(randomTime).toISOString();
}

// Generate random post content
function getRandomContent() {
  return postContents[Math.floor(Math.random() * postContents.length)];
}

// Generate random location
function getRandomLocation() {
  return locations[Math.floor(Math.random() * locations.length)];
}

// Generate random image URL (70% chance of having an image)
function getRandomImageUrl() {
  if (Math.random() < 0.7) {
    return sampleImageUrls[Math.floor(Math.random() * sampleImageUrls.length)];
  }
  return null;
}

// Generate posts in batches
async function generatePosts(totalPosts = 10000, batchSize = 100) {
  try {
    console.log(`Starting to generate ${totalPosts} posts...`);
    
    // First, get all user IDs from the database
    console.log('Fetching user IDs...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1000); // Get up to 1000 users
    
    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }
    
    if (!users || users.length === 0) {
      throw new Error('No users found in database. Please create some users first.');
    }
    
    console.log(`Found ${users.length} users. Will distribute posts among them.`);
    
    const userIds = users.map(u => u.id);
    const totalBatches = Math.ceil(totalPosts / batchSize);
    let insertedCount = 0;
    
    console.log(`Generating posts in ${totalBatches} batches of ${batchSize}...`);
    
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const batchPosts = [];
      const postsInThisBatch = Math.min(batchSize, totalPosts - insertedCount);
      
      for (let i = 0; i < postsInThisBatch; i++) {
        const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
        const randomDate = getRandomDate();
        
        batchPosts.push({
          user_id: randomUserId,
          content: getRandomContent(),
          image_url: getRandomImageUrl(),
          location: getRandomLocation(),
          created_at: randomDate,
          updated_at: randomDate
        });
      }
      
      // Insert batch
      const { data, error } = await supabase
        .from('posts')
        .insert(batchPosts)
        .select();
      
      if (error) {
        console.error(`Error inserting batch ${batchNum + 1}:`, error);
        throw error;
      }
      
      insertedCount += data.length;
      const progress = ((insertedCount / totalPosts) * 100).toFixed(2);
      console.log(`Batch ${batchNum + 1}/${totalBatches} completed: ${insertedCount}/${totalPosts} posts (${progress}%)`);
      
      // Small delay to avoid overwhelming the database
      if (batchNum < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`\n✅ Successfully generated ${insertedCount} posts!`);
    console.log(`Posts distributed among ${userIds.length} users.`);
    console.log(`Posts created over the last 6 months.`);
    
  } catch (error) {
    console.error('Error generating posts:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  const totalPosts = process.argv[2] ? parseInt(process.argv[2]) : 10000;
  generatePosts(totalPosts)
    .then(() => {
      console.log('Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { generatePosts };

