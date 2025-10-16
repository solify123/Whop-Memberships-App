import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import config from './config';
import WhopClient, { Product, Membership } from './whopClient';
import connectToDatabase from './db';
import ProductModel from './models/Product';
import MembershipModel from './models/Membership';
import cors from 'cors';

const app = express();
const whopClient = new WhopClient();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// JSON APIs for frontend
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    const productsDocs = await ProductModel.find();
    const membershipsDocs = await MembershipModel.find();
    const activeByProduct: Record<string, number> = {};
    membershipsDocs.forEach((m: any) => {
      if (m.productId) {
        activeByProduct[m.productId] = (activeByProduct[m.productId] || 0) + 1;
      }
    });
    const products = productsDocs.map((p: any) => ({
      id: p.productId,
      title: p.title,
      visibility: p.visibility,
      activeUsers: p.activeUsers,
    }));
    res.json({ products, activeByProduct });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/products/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const productDoc = await ProductModel.findOne({ productId });
    const membershipsDocs = await MembershipModel.find({ productId });
    const product = productDoc ? { id: productDoc.productId, title: productDoc.title, visibility: productDoc.visibility, activeUsers: productDoc.activeUsers } : null;
    const memberships = membershipsDocs.map((m: any) => ({ id: m.membershipId, user: m.userId, email: m.email }));
    res.json({ product, memberships });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Send DM to all memberships of a product (JSON API)
app.post('/api/products/:productId/message', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { message } = req.body as { message?: string };

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const membershipsDocs = await MembershipModel.find({ productId }).lean();
    const productMemberships: Membership[] = membershipsDocs.map(m => ({
      id: m.membershipId,
      user: m.userId,
      email: m.email,
      product: m.productId,
      status: 'completed',
      valid: true,
    })) as unknown as Membership[];

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < productMemberships.length; i++) {
      const membership = productMemberships[i];
      const userId = membership.user;
      const membershipId = membership.id;

      if (!userId) {
        errorCount++;
        errors.push(`Membership ${membershipId}: No user ID`);
        continue;
      }

      const result = await whopClient.sendDirectMessage(userId, message);
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        errors.push(`Membership ${membershipId}: ${result.error}`);
      }
    }

    return res.json({ success: true, successCount, errorCount, errors });
  } catch (e: any) {
    console.error('[Server] Error sending DMs (API):', e);
    return res.status(500).json({ error: e.message });
  }
});

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../templates'));

// Routes
app.get('/', (req: Request, res: Response) => {
  res.redirect('/products');
});

app.get('/products', async (req: Request, res: Response) => {
  try {
    console.log('[Server] Loading products and memberships from DB');

    const [productsDocs, membershipsDocs] = await Promise.all([
      ProductModel.find({}).lean(),
      MembershipModel.find({}).lean(),
    ]);

    const products = productsDocs.map(p => ({
      id: p.productId,
      name: p.title,
      title: p.title,
      visibility: p.visibility,
      activeUsersCount: p.activeUsers,
    })) as unknown as Product[];

    const memberships = membershipsDocs.map(m => ({
      id: m.membershipId,
      user: m.userId,
      email: m.email,
      product: m.productId,
      status: 'completed',
      valid: true,
    })) as unknown as Membership[];

    const error = null;

    // Count active memberships per product
    const activeByProduct: Record<string, number> = {};
    if (memberships) {
      memberships.forEach(membership => {
        if (membership.status === 'completed' && membership.valid === true) {
          const productId = membership.product;
          if (productId) {
            activeByProduct[productId] = (activeByProduct[productId] || 0) + 1;
          }
        }
      });
    }

    res.render('products', {
      products,
      activeByProduct,
      error
    });
  } catch (error: any) {
    console.error('[Server] Error in products route:', error);
    res.render('products', {
      products: [],
      activeByProduct: {},
      error: error.message
    });
  }
});

app.get('/products/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { success, error } = req.query;

    console.log(`[Server] Fetching product detail for: ${productId}`);

    const [productsDocs, membershipsDocs] = await Promise.all([
      ProductModel.find({}).lean(),
      MembershipModel.find({ productId }).lean(),
    ]);
    const products = productsDocs.map(p => ({
      id: p.productId,
      name: p.title,
      title: p.title,
      visibility: p.visibility,
      activeUsersCount: p.activeUsers,
    })) as unknown as Product[];
    const memberships = membershipsDocs.map(m => ({
      id: m.membershipId,
      user: m.userId,
      email: m.email,
      product: m.productId,
      status: 'completed',
      valid: true,
    })) as unknown as Membership[];
    const fetchError = null;

    // Find the specific product
    const product = products.find(p => p.id === productId);

    // Filter memberships for this product
    const productMemberships = memberships.filter(m => m.product === productId);

    console.log(`[Server] Found ${productMemberships.length} memberships for product ${productId}`);

    res.render('product_detail', {
      product,
      memberships: productMemberships,
      error: fetchError,
      successMsg: success,
      errorMsg: error
    });
  } catch (error: any) {
    console.error('[Server] Error in product detail route:', error);
    res.render('product_detail', {
      product: null,
      memberships: [],
      error: error.message,
      successMsg: null,
      errorMsg: null
    });
  }
});

app.post('/products/:productId', async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { message } = req.body;
  try {

    if (!message || message.trim() === '') {
      return res.redirect(`/products/${productId}?error=Message cannot be empty`);
    }

    // Fetch memberships for this product
    const membershipsResult = await whopClient.getMemberships();
    const memberships: Membership[] = membershipsResult.data;
    const productMemberships = memberships.filter(m => m.product === productId);

    // Send messages to all memberships
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < productMemberships.length; i++) {
      const membership = productMemberships[i];
      const userId = membership.user;
      const email = membership.email || 'no email';
      const membershipId = membership.id;

      if (!userId) {
        errorCount++;
        const errorMsg = `Membership ${membershipId}: No user ID`;
        errors.push(errorMsg);
        console.log(`  Status: ❌ FAILED - No user ID`);
        continue;
      }

      try {
        const result = await whopClient.sendDirectMessage(userId, message);

        if (result.success) {
          successCount++;
          console.log(`  Status: ✅ SUCCESS`);
          console.log(`  Response: ${JSON.stringify(result.data)}`);
        } else {
          errorCount++;
          const errorMsg = `Membership ${membershipId}: ${result.error}`;
          errors.push(errorMsg);
          console.log(`  Status: ❌ FAILED - ${result.error}`);
        }
      } catch (error: any) {
        errorCount++;
        const errorMsg = `Membership ${membershipId}: ${error.message}`;
        errors.push(errorMsg);
        console.log(`  Status: ❌ FAILED - ${error.message}`);
      }
    }

    // Redirect with result message
    let redirectMsg: string;
    if (errorCount === 0) {
      redirectMsg = `Message sent successfully to ${successCount} members`;
    } else {
      redirectMsg = `Message sent to ${successCount} members, ${errorCount} failed`;
    }

    res.redirect(`/products/${productId}?success=${encodeURIComponent(redirectMsg)}`);
  } catch (error: any) {
    console.error('[Server] Error in message sending:', error);
    res.redirect(`/products/${productId}?error=${encodeURIComponent(error.message)}`);
  }
});

app.post('/sendMessage')
// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).render('error', { error: err.message, url: req.url });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).render('error', { error: 'Page not found', url: req.url });
});

// Start server
const PORT = config.port;
app.listen(PORT, async () => {
  try {
    await connectToDatabase();
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
  }
  console.log(`🚀 Whop Dashboard Server running on http://localhost:${PORT}`);
  console.log(`📊 Products: http://localhost:${PORT}/products`);
  console.log(`🔧 Environment: ${config.nodeEnv}`);
});
