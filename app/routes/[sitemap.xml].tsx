import { LoaderFunction } from "@remix-run/node";
import { domain } from "~/config";
import { db } from "~/db/db.server";
import { products } from "~/db/schema";

export const loader: LoaderFunction = async () => {
	const allProducts = await db
		.select({
			id: products.id,
			name: products.name,
			updatedAt: products.updatedAt,
		})
		.from(products)
		.orderBy(products.updatedAt);

	const content = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url>
        <loc>${domain}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
      </url>
      ${allProducts
				.map(
					(product) => `
      <url>
        <loc>${domain}/product/${product.id}</loc>
        <lastmod>${product.updatedAt.toISOString()}</lastmod>
      </url>`
				)
				.join("")}
    </urlset>`;

	return new Response(content, {
		status: 200,
		headers: {
			"Content-Type": "application/xml",
			"xml-version": "1.0",
			encoding: "UTF-8",
		},
	});
};
