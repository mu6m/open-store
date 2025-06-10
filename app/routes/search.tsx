import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { ProductGrid } from "~/component/ProductGrid";
import { getProducts } from "~/utils/products.server";

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url);
	const page = parseInt(url.searchParams.get("page") ?? "1");
	const searchQuery = url.searchParams.get("q") ?? "";

	return json(await getProducts(page, searchQuery));
}

export default function SearchPage() {
	const data: any = useLoaderData<typeof loader>();
	const [searchParams] = useSearchParams();
	const searchQuery = searchParams.get("q") ?? "";

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-2xl font-bold mb-6">search for "{searchQuery}"</h1>
			<ProductGrid {...data} />
		</div>
	);
}
