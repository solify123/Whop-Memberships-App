import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import config from './config';
import WhopClient, { Product, Membership } from './whopClient';

const app = express();
const whopClient = new WhopClient();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../templates'));

// Routes
app.get('/', (req: Request, res: Response) => {
  res.redirect('/products');
});

app.get('/products', async (req: Request, res: Response) => {
  try {
    console.log('[Server] Fetching products and memberships');

    // Fetch products and memberships in parallel
    const [productsResult, membershipsResult] = await Promise.all([
      whopClient.getProducts(),
      whopClient.getMemberships()
    ]);

    const products: Product[] = productsResult.data;
    const memberships: Membership[] = membershipsResult.data;
    const error = productsResult.error || membershipsResult.error;

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

    // Fetch products and memberships
    const [productsResult, membershipsResult] = await Promise.all([
      whopClient.getProducts(),
      whopClient.getMemberships()
    ]);

    const products: Product[] = productsResult.data;
    const memberships: Membership[] = membershipsResult.data;
    const fetchError = productsResult.error || membershipsResult.error;

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
app.listen(PORT, () => {
  console.log(`🚀 Whop Dashboard Server running on http://localhost:${PORT}`);
  console.log(`📊 Products: http://localhost:${PORT}/products`);
  console.log(`🔧 Environment: ${config.nodeEnv}`);
});
