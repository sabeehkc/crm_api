import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WebsiteContent from '../models/website-content';
import WebsiteAboutUs from '../models/website-about-us';
import WebsiteProduct from '../models/website-product';
import WebsiteClient from '../models/website-client';
import WebsiteDirector from '../models/website-director';
import WebsiteNews from '../models/website-news';
import WebsiteTool from '../models/website-tool';
import WebsiteFaq from '../models/website-faq';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/luvid-crm';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Use raw collection to get fields that are no longer in the Mongoose schema
  const cursor = WebsiteContent.collection.find({});
  let count = 0;

  for await (const rawDoc of cursor) {
    count++;
    const tenantId = rawDoc.tenantId;
    if (!tenantId) continue;

    console.log(`Migrating tenant ${tenantId}...`);

    if (rawDoc.aboutUs?.length) {
      for (const item of rawDoc.aboutUs) {
        try { await WebsiteAboutUs.create({ ...item, tenantId }); } catch (e) { console.log('Skipped duplicate AboutUs') }
      }
    }
    if (rawDoc.products?.length) {
      for (const item of rawDoc.products) {
        try { await WebsiteProduct.create({ ...item, tenantId }); } catch (e) { console.log('Skipped duplicate Product') }
      }
    }
    if (rawDoc.clients?.length) {
      for (const item of rawDoc.clients) {
        try { await WebsiteClient.create({ ...item, tenantId }); } catch (e) { console.log('Skipped duplicate Client') }
      }
    }
    if (rawDoc.directors?.length) {
      for (const item of rawDoc.directors) {
        try { await WebsiteDirector.create({ ...item, tenantId }); } catch (e) { console.log('Skipped duplicate Director') }
      }
    }
    if (rawDoc.news?.length) {
      for (const item of rawDoc.news) {
        try { await WebsiteNews.create({ ...item, tenantId }); } catch (e) { console.log('Skipped duplicate News') }
      }
    }
    if (rawDoc.tools?.length) {
      for (const item of rawDoc.tools) {
        try { await WebsiteTool.create({ ...item, tenantId }); } catch (e) { console.log('Skipped duplicate Tool') }
      }
    }
    if (rawDoc.faq?.length) {
      for (const item of rawDoc.faq) {
        try { await WebsiteFaq.create({ ...item, tenantId }); } catch (e) { console.log('Skipped duplicate FAQ') }
      }
    }

    // Optionally: remove the old arrays from the document
    await WebsiteContent.collection.updateOne(
      { _id: rawDoc._id },
      { $unset: { aboutUs: "", products: "", clients: "", directors: "", news: "", tools: "", faq: "" } }
    );

    console.log(`Tenant ${tenantId} migrated successfully.`);
  }

  console.log(`Migration complete for ${count} documents.`);
  process.exit(0);
}

run().catch(console.error);
