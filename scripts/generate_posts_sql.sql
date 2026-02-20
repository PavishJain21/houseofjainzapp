-- SQL Script to generate 10,000 post records
-- Run this script in your Supabase SQL editor or psql
-- 
-- Note: This script assumes you have users in the users table
-- Adjust the user_id selection based on your actual user IDs

-- Function to generate random posts
DO $$
DECLARE
    user_count INTEGER;
    user_ids UUID[];
    random_user_id UUID;
    post_content TEXT;
    post_location TEXT;
    post_image_url TEXT;
    random_date TIMESTAMP WITH TIME ZONE;
    i INTEGER;
    locations TEXT[] := ARRAY[
        'Mumbai, Maharashtra',
        'Delhi, NCR',
        'Ahmedabad, Gujarat',
        'Jaipur, Rajasthan',
        'Surat, Gujarat',
        'Pune, Maharashtra',
        'Bangalore, Karnataka',
        'Kolkata, West Bengal',
        'Chennai, Tamil Nadu',
        'Hyderabad, Telangana',
        'Indore, Madhya Pradesh',
        'Nagpur, Maharashtra',
        'Vadodara, Gujarat',
        'Rajkot, Gujarat',
        'Bhopal, Madhya Pradesh',
        'Patna, Bihar',
        'Lucknow, Uttar Pradesh',
        'Kanpur, Uttar Pradesh',
        'Agra, Uttar Pradesh',
        'Varanasi, Uttar Pradesh'
    ];
    contents TEXT[] := ARRAY[
        'Had an amazing Jain community gathering today! 🙏',
        'Sharing some delicious vegetarian recipes from our community kitchen.',
        'Beautiful Jain temple visit this weekend. Blessed to be part of this community!',
        'Looking for recommendations for Jain-friendly restaurants in the area.',
        'Community service event was a huge success! Thank you everyone who participated.',
        'Sharing some thoughts on Jain philosophy and daily practice.',
        'Great to see so many young Jains actively participating in community events!',
        'Vegetarian food festival was amazing! So many delicious options.',
        'Community meditation session was peaceful and rejuvenating.',
        'Looking forward to the upcoming Jain festival celebrations!',
        'Sharing some beautiful Jain artwork I came across recently.',
        'Community book club meeting was insightful. Great discussions!',
        'Jain principles in daily life - sharing my experiences.',
        'Amazing to see the Jain community growing stronger every day!',
        'Vegetarian cooking tips from our community elders.',
        'Community charity drive was successful. Proud of everyone''s contribution!',
        'Jain temple architecture is truly magnificent.',
        'Sharing some inspiring quotes from Jain scriptures.',
        'Community yoga session was refreshing!',
        'Great to connect with fellow Jains at the community center.'
    ];
BEGIN
    -- Get user IDs
    SELECT array_agg(id) INTO user_ids FROM users LIMIT 1000;
    user_count := array_length(user_ids, 1);
    
    IF user_count IS NULL OR user_count = 0 THEN
        RAISE EXCEPTION 'No users found in database. Please create some users first.';
    END IF;
    
    RAISE NOTICE 'Found % users. Generating 10,000 posts...', user_count;
    
    -- Generate 10,000 posts
    FOR i IN 1..10000 LOOP
        -- Select random user
        random_user_id := user_ids[1 + floor(random() * user_count)::int];
        
        -- Select random content
        post_content := contents[1 + floor(random() * array_length(contents, 1))::int];
        
        -- Select random location
        post_location := locations[1 + floor(random() * array_length(locations, 1))::int];
        
        -- 70% chance of having an image
        IF random() < 0.7 THEN
            post_image_url := 'https://images.unsplash.com/photo-' || 
                (1000000000 + floor(random() * 9999999999))::text || 
                '?w=800';
        ELSE
            post_image_url := NULL;
        END IF;
        
        -- Random date within last 6 months
        random_date := NOW() - (random() * interval '180 days');
        
        -- Insert post
        INSERT INTO posts (user_id, content, image_url, location, created_at, updated_at)
        VALUES (
            random_user_id,
            post_content,
            post_image_url,
            post_location,
            random_date,
            random_date
        );
        
        -- Progress indicator every 1000 posts
        IF i % 1000 = 0 THEN
            RAISE NOTICE 'Generated % posts...', i;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Successfully generated 10,000 posts!';
END $$;

-- Verify the count
SELECT COUNT(*) as total_posts FROM posts;
SELECT COUNT(DISTINCT user_id) as users_with_posts FROM posts;

