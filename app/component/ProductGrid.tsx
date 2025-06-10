import { Link } from "@remix-run/react";

interface Product {
	id: string;
	name: string;
	description: string | null;
	price: number;
	quantity: number;
	imageUrl: string | null;
}

interface ProductGridProps {
	products: Product[];
	totalPages: number;
	currentPage: number;
}

export function ProductGrid({
	products,
	totalPages,
	currentPage,
}: ProductGridProps) {
	return (
		<div className="space-y-8 mx-auto max-w-7xl w-full ">
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{products.map((product) => (
					<Link key={product.id} to={`/part/${product.id}`}>
						<div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border-solid border-stone-950 border-2">
							{product.imageUrl ? (
								<img
									loading="lazy"
									src={product.imageUrl}
									alt={product.name}
									className="w-full h-auto mx-auto object-cover"
								/>
							) : (
								<div className="w-full h-48 bg-gray-200 flex items-center justify-center">
									<span className="text-gray-400">لا يوجد صورة</span>
								</div>
							)}
							<div className="p-4">
								<h3 className="text-lg font-semibold text-gray-800 mb-2">
									{product.name}
								</h3>
								<p className="text-gray-600 text-sm my-4 line-clamp-2 ">
									{product.description}
								</p>
								<div className="flex justify-between items-center">
									<span className="text-lg font-bold text-gray-900">
										$ {Number(product.price).toFixed(2)}
									</span>
									<span className="text-sm font-semibold text-gray-900">
										remaining {product.quantity}
									</span>
								</div>
							</div>
						</div>
					</Link>
				))}
			</div>

			{products.length === 0 && (
				<div className="text-center py-12">
					<p className="text-gray-500 text-lg">no products</p>
				</div>
			)}

			{totalPages > 1 && (
				<div className="flex justify-center items-center gap-2 mt-6">
					{currentPage > 1 && (
						<Link
							to={`?page=${currentPage - 1}`}
							className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700"
						>
							previous
						</Link>
					)}

					{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
						<Link
							key={page}
							to={`?page=${page}`}
							className={`px-4 py-2 rounded-md ${
								page === currentPage
									? "bg-blue-500 text-white"
									: "bg-gray-200 hover:bg-gray-300 text-gray-700"
							}`}
						>
							{page}
						</Link>
					))}

					{currentPage < totalPages && (
						<Link
							to={`?page=${currentPage + 1}`}
							className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700"
						>
							next
						</Link>
					)}
				</div>
			)}
		</div>
	);
}
