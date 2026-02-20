const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Dummy data arrays
const religions = ['Jain', 'Hindu', 'Sikh', 'Buddhist'];
const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat'];
const shopNames = [
  'Jain Grocery Store', 'Pure Veg Mart', 'Organic Foods', 'Jain Sweets', 'Spice Bazaar',
  'Fresh Vegetables', 'Dairy Delight', 'Grain Store', 'Herbal Products', 'Traditional Foods',
  'Jain Snacks', 'Healthy Bites', 'Pure Kitchen', 'Veggie World', 'Natural Store'
];
const productNames = [
  'Basmati Rice', 'Wheat Flour', 'Sugar', 'Salt', 'Turmeric Powder', 'Red Chili Powder',
  'Coriander Seeds', 'Cumin Seeds', 'Mustard Oil', 'Ghee', 'Milk', 'Yogurt',
  'Paneer', 'Tomatoes', 'Onions', 'Potatoes', 'Carrots', 'Beans', 'Cabbage', 'Cauliflower',
  'Apples', 'Bananas', 'Oranges', 'Grapes', 'Mangoes', 'Lentils', 'Chickpeas', 'Black Gram',
  'Green Gram', 'Soybeans', 'Almonds', 'Cashews', 'Raisins', 'Dates', 'Honey'
];
const categories = ['Grocery', 'Vegetables', 'Fruits', 'Dairy', 'Spices', 'Grains', 'Dry Fruits', 'Beverages'];

// Helper function to generate random date within last N days
function randomDate(daysAgo = 30) {
  const now = new Date();
  const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

// Generate random string
function randomString(length = 10) {
  return Math.random().toString(36).substring(2, length + 2);
}

// Generate random number in range
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate random element from array
function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Hash password
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Generate users
async function generateUsers(count = 50) {
  console.log(`\n📝 Generating ${count} users...`);
  const users = [];
  const password = await hashPassword('password123'); // Default password for all dummy users

  for (let i = 0; i < count; i++) {
    const firstName = ['Raj', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Rahul', 'Kavita', 'Suresh', 'Meera'][i % 10];
    const lastName = ['Sharma', 'Patel', 'Gupta', 'Singh', 'Kumar', 'Jain', 'Mehta', 'Shah', 'Agarwal', 'Verma'][Math.floor(i / 10) % 10];
    const name = `${firstName} ${lastName}`;
    const email = `user${i + 1}@test.com`;
    const phone = `9${randomInt(100000000, 999999999)}`;

    users.push({
      email,
      password,
      name,
      religion: randomElement(religions),
      phone,
      created_at: randomDate(60).toISOString(),
    });
  }

  // Insert users in batches
  const batchSize = 10;
  let inserted = 0;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('users')
      .insert(batch)
      .select('id, email');

    if (error) {
      console.error(`Error inserting users batch ${i / batchSize + 1}:`, error.message);
    } else {
      inserted += data.length;
      console.log(`  ✓ Inserted ${inserted}/${count} users`);
    }
  }

  return inserted;
}

// Generate shops
async function generateShops(userIds, count = 20) {
  console.log(`\n🏪 Generating ${count} shops...`);
  const shops = [];
  const shopOwners = userIds.slice(0, Math.min(count, userIds.length));

  for (let i = 0; i < count && i < shopOwners.length; i++) {
    const ownerId = shopOwners[i];
    const name = `${randomElement(shopNames)} ${i + 1}`;
    const city = randomElement(cities);
    const description = `A premium ${randomElement(categories).toLowerCase()} store in ${city}`;

    shops.push({
      owner_id: ownerId,
      name,
      description,
      location: city,
      is_active: Math.random() > 0.1, // 90% active
      created_at: randomDate(45).toISOString(),
    });
  }

  const { data, error } = await supabase
    .from('shops')
    .insert(shops)
    .select('id, owner_id, name');

  if (error) {
    console.error('Error inserting shops:', error.message);
    return [];
  }

  console.log(`  ✓ Inserted ${data.length} shops`);
  return data;
}

// Generate products
async function generateProducts(shops, countPerShop = 10) {
  console.log(`\n📦 Generating products (${countPerShop} per shop)...`);
  let totalInserted = 0;

  for (const shop of shops) {
    const products = [];
    const productCount = randomInt(5, countPerShop);

    for (let i = 0; i < productCount; i++) {
      const name = randomElement(productNames);
      const category = randomElement(categories);
      const price = randomInt(10, 1000);
      const stock = randomInt(0, 100);
      const description = `High quality ${name.toLowerCase()} - ${category}`;

      products.push({
        shop_id: shop.id,
        name: `${name} ${i + 1}`,
        description,
        price,
        stock,
        category,
        is_active: Math.random() > 0.15, // 85% active
        image_url: null, // No images for dummy data
        created_at: randomDate(30).toISOString(),
      });
    }

    const { data, error } = await supabase
      .from('products')
      .insert(products)
      .select('id, shop_id, name');

    if (error) {
      console.error(`Error inserting products for shop ${shop.name}:`, error.message);
    } else {
      totalInserted += data.length;
    }
  }

  console.log(`  ✓ Inserted ${totalInserted} products`);
  return totalInserted;
}

// Generate posts
async function generatePosts(userIds, count = 100) {
  console.log(`\n📱 Generating ${count} posts...`);
  const posts = [];
  const postContents = [
    'Great community event today!',
    'Sharing some amazing recipes',
    'Check out this beautiful place',
    'Wonderful experience at the temple',
    'Amazing food at the local restaurant',
    'Community gathering was fantastic',
    'Sharing some thoughts',
    'Beautiful day in the city',
    'Great time with friends',
    'Sharing some wisdom',
  ];

  for (let i = 0; i < count; i++) {
    const userId = randomElement(userIds);
    const content = `${randomElement(postContents)} ${i + 1}`;
    const city = randomElement(cities);
    const hasImage = Math.random() > 0.5; // 50% have images

    posts.push({
      user_id: userId,
      content,
      location: city,
      image_url: hasImage ? `/uploads/community/dummy-${i}.jpg` : null,
      created_at: randomDate(20).toISOString(),
    });
  }

  // Insert in batches
  const batchSize = 20;
  let inserted = 0;
  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('posts')
      .insert(batch)
      .select('id, user_id');

    if (error) {
      console.error(`Error inserting posts batch ${i / batchSize + 1}:`, error.message);
    } else {
      inserted += data.length;
    }
  }

  console.log(`  ✓ Inserted ${inserted} posts`);
  return inserted;
}

// Generate likes
async function generateLikes(posts, userIds) {
  console.log(`\n❤️  Generating likes...`);
  let totalLikes = 0;

  for (const post of posts) {
    const likeCount = randomInt(0, 20);
    const likers = userIds.sort(() => 0.5 - Math.random()).slice(0, likeCount);

    for (const userId of likers) {
      const { error } = await supabase
        .from('likes')
        .insert({
          post_id: post.id,
          user_id: userId,
          created_at: randomDate(15).toISOString(),
        });

      if (!error) {
        totalLikes++;
      }
    }
  }

  console.log(`  ✓ Inserted ${totalLikes} likes`);
  return totalLikes;
}

// Generate comments
async function generateComments(posts, userIds, countPerPost = 3) {
  console.log(`\n💬 Generating comments...`);
  let totalComments = 0;
  const commentTexts = [
    'Great post!',
    'Amazing!',
    'Thanks for sharing',
    'Love it!',
    'Very helpful',
    'Nice one',
    'Keep it up!',
    'Wonderful',
    'Excellent',
    'Good job',
  ];

  for (const post of posts) {
    const commentCount = randomInt(0, countPerPost);
    const commenters = userIds.sort(() => 0.5 - Math.random()).slice(0, commentCount);

    for (const userId of commenters) {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: userId,
          content: randomElement(commentTexts),
          created_at: randomDate(10).toISOString(),
        });

      if (!error) {
        totalComments++;
      }
    }
  }

  console.log(`  ✓ Inserted ${totalComments} comments`);
  return totalComments;
}

// Generate orders
async function generateOrders(userIds, shops) {
  console.log(`\n🛒 Generating orders...`);
  const orders = [];
  const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  const statusWeights = [0.1, 0.2, 0.15, 0.15, 0.3, 0.1]; // Weighted random

  // Get products for each shop
  const shopProducts = {};
  for (const shop of shops) {
    const { data: products } = await supabase
      .from('products')
      .select('id, price, stock')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .gt('stock', 0)
      .limit(10);

    if (products && products.length > 0) {
      shopProducts[shop.id] = products;
    }
  }

  const orderCount = randomInt(30, 50);
  for (let i = 0; i < orderCount; i++) {
    const customerId = randomElement(userIds);
    const shop = randomElement(shops);
    const products = shopProducts[shop.id];

    if (!products || products.length === 0) continue;

    // Select random products for order
    const orderItems = [];
    const itemCount = randomInt(1, Math.min(5, products.length));
    const selectedProducts = products.sort(() => 0.5 - Math.random()).slice(0, itemCount);

    let totalAmount = 0;
    for (const product of selectedProducts) {
      const quantity = randomInt(1, Math.min(5, product.stock));
      orderItems.push({
        product_id: product.id,
        quantity,
        price: product.price,
      });
      totalAmount += product.price * quantity;
    }

    // Weighted random status
    const rand = Math.random();
    let cumulative = 0;
    let status = 'pending';
    for (let j = 0; j < statuses.length; j++) {
      cumulative += statusWeights[j];
      if (rand <= cumulative) {
        status = statuses[j];
        break;
      }
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: customerId,
        shop_id: shop.id,
        address_id: null, // No addresses for dummy data
        total_amount: totalAmount,
        status,
        payment_method: Math.random() > 0.5 ? 'cash_on_delivery' : 'online',
        created_at: randomDate(30).toISOString(),
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error(`Error creating order ${i + 1}:`, orderError?.message);
      continue;
    }

    // Create order items
    const orderItemsData = orderItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsData);

    if (itemsError) {
      console.error(`Error creating order items for order ${order.id}:`, itemsError.message);
      // Delete the order if items failed
      await supabase.from('orders').delete().eq('id', order.id);
    } else {
      orders.push(order);
    }
  }

  console.log(`  ✓ Inserted ${orders.length} orders`);
  return orders;
}

// Generate notifications
async function generateNotifications(userIds, orders) {
  console.log(`\n🔔 Generating notifications...`);
  let totalNotifications = 0;

  for (const order of orders) {
    // Get shop owner
    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id')
      .eq('id', order.shop_id)
      .single();

    if (!shop) continue;

    // Notification for shop owner (order placed)
    const { error: error1 } = await supabase
      .from('notifications')
      .insert({
        user_id: shop.owner_id,
        type: 'order_placed',
        title: 'New Order Received',
        message: `You have received a new order #${order.id.slice(0, 8)}`,
        data: { order_id: order.id },
        is_read: Math.random() > 0.3, // 70% read
        created_at: order.created_at,
      });

    if (!error1) totalNotifications++;

    // Notification for customer (if order status is not pending)
    if (order.status !== 'pending') {
      const statusMessages = {
        confirmed: 'Your order has been confirmed',
        processing: 'Your order is being processed',
        shipped: 'Your order has been shipped',
        delivered: 'Your order has been delivered',
        cancelled: 'Your order has been cancelled',
      };

      const { error: error2 } = await supabase
        .from('notifications')
        .insert({
          user_id: order.user_id,
          type: 'order_status_changed',
          title: 'Order Status Updated',
          message: `Order #${order.id.slice(0, 8)}: ${statusMessages[order.status] || 'Status updated'}`,
          data: { order_id: order.id, new_status: order.status },
          is_read: Math.random() > 0.4, // 60% read
          created_at: randomDate(20).toISOString(),
        });

      if (!error2) totalNotifications++;
    }
  }

  console.log(`  ✓ Inserted ${totalNotifications} notifications`);
  return totalNotifications;
}

// Main function
async function main() {
  console.log('🚀 Starting dummy data generation...\n');
  console.log('⚠️  This will insert data into your database!');
  console.log('⚠️  Make sure you have backed up your data if needed.\n');

  try {
    // Step 1: Generate users
    const userCount = await generateUsers(50);
    if (userCount === 0) {
      console.error('❌ Failed to generate users. Exiting...');
      return;
    }

    // Get all user IDs
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!users || users.length === 0) {
      console.error('❌ No users found. Exiting...');
      return;
    }

    const userIds = users.map(u => u.id);
    console.log(`  ✓ Found ${userIds.length} users\n`);

    // Step 2: Generate shops
    const shops = await generateShops(userIds, 20);
    if (shops.length === 0) {
      console.error('❌ Failed to generate shops. Exiting...');
      return;
    }

    // Step 3: Generate products
    await generateProducts(shops, 10);

    // Step 4: Generate posts
    const postCount = await generatePosts(userIds, 100);
    if (postCount === 0) {
      console.log('⚠️  No posts generated, skipping likes and comments...');
    } else {
      // Get all posts
      const { data: allPosts } = await supabase
        .from('posts')
        .select('id, user_id')
        .order('created_at', { ascending: false })
        .limit(100);

      if (allPosts && allPosts.length > 0) {
        // Step 5: Generate likes
        await generateLikes(allPosts, userIds);

        // Step 6: Generate comments
        await generateComments(allPosts, userIds, 3);
      }
    }

    // Step 7: Generate orders
    const orders = await generateOrders(userIds, shops);

    // Step 8: Generate notifications
    if (orders.length > 0) {
      await generateNotifications(userIds, orders);
    }

    console.log('\n✅ Dummy data generation completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Users: ${userIds.length}`);
    console.log(`   • Shops: ${shops.length}`);
    console.log(`   • Orders: ${orders.length}`);
    console.log(`   • Posts: ${postCount}`);
    console.log('\n💡 Default password for all test users: password123');
    console.log('💡 Test user emails: user1@test.com, user2@test.com, etc.');

  } catch (error) {
    console.error('\n❌ Error generating dummy data:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main };

