import app from '../src/index';

// Export a handler function for @vercel/node
export default function handler(req: any, res: any) {
  return (app as any)(req, res);
}

