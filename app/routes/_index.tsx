import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { ProductGrid } from "~/component/ProductGrid";
import { getProducts } from "~/utils/products.server";

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url);
	const page = parseInt(url.searchParams.get("page") ?? "1");

	return json(await getProducts(page));
}

export default function ProductsPage() {
	const data: any = useLoaderData<typeof loader>();

	return (
		<div className="container px-4 py-8">
			<ProductGrid {...data} />
		</div>
	);
}
