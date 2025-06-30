import { Link } from "@remix-run/react";
import { useState } from "react";

interface Product {
	id: string;
	name: string;
	description?: string;
	price: number;
	quantity: number;
	quantityType: "limited" | "unlimited";
	categoryId?: string;
	images: string[];
	info?: string;
	details: any[];
	category?: {
		id: string;
		name: string;
		description?: string;
	};
}

interface ProductGridProps {
	products: Product[];
	totalPages: number;
	currentPage: number;
}

function Image({
	images,
	productName,
}: {
	images: string[];
	productName: string;
}) {
	const [currentIndex, setCurrentIndex] = useState(0);

	if (images.length === 0) {
		return (
			<div className="relative w-full aspect-square bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center group">
				<div className="text-neutral-400 text-sm font-medium">no images</div>
				<div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500"></div>
			</div>
		);
	}

	return (
		<div className="relative w-full aspect-square overflow-hidden group">
			<div
				className="flex transition-transform duration-700 ease-out h-full"
				style={{ transform: `translateX(-${currentIndex * 100}%)` }}
			>
				<img
					loading="lazy"
					src={images[0]}
					alt={productName}
					className="w-full h-full object-cover flex-shrink-0"
				/>
			</div>

			<div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
		</div>
	);
}

export function ProductGrid({
	products,
	totalPages,
	currentPage,
}: ProductGridProps) {
	const isSoldOut = (product: Product) => {
		return product.quantityType === "limited" && product.quantity === 0;
	};

	return (
		<div className="space-y-12 mx-auto max-w-7xl w-full">
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
				{products.map((product) => (
					<article className="group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-neutral-100 hover:border-neutral-200 transform hover:-translate-y-1">
						<Image images={product.images} productName={product.name} />
						<Link key={product.id} to={`/product/${product.id}`}>
							<div className="p-6 space-y-4">
								{/* Category and sold status */}
								<div className="flex items-center justify-between">
									{product.category && (
										<span className="inline-block px-3 py-1 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-full">
											{product.category.name}
										</span>
									)}
									{isSoldOut(product) && (
										<span className="inline-block px-3 py-1 text-xs font-bold text-red-600 bg-red-50 rounded-full border border-red-200">
											SOLD OUT !
										</span>
									)}
								</div>

								{/* Product name */}
								<h3 className="text-xl font-bold text-neutral-900 group-hover:text-neutral-700 transition-colors duration-300 line-clamp-2">
									{product.name}
								</h3>

								{/* Description */}
								{product.description && product.description.trim() !== "" && (
									<p className="text-neutral-600 text-sm leading-relaxed line-clamp-3">
										{product.description}
									</p>
								)}

								{/* Info */}
								{product.info && product.info.trim() !== "" && (
									<p className="text-green-500 text-xs font-medium">
										{product.info}
									</p>
								)}

								{/* Price and quantity */}
								<div className="flex items-end justify-between pt-2">
									<div>
										<span className="text-2xl font-bold text-neutral-900">
											${Number(product.price).toFixed(2)}
										</span>
										{product.quantityType === "limited" &&
											!isSoldOut(product) && (
												<div className="text-sm text-neutral-500 font-medium mt-1">
													{product.quantity} remaining
												</div>
											)}
									</div>

									<div className="w-8 h-8 rounded-full bg-neutral-900 group-hover:bg-neutral-700 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
										<svg
											className="w-4 h-4 text-white"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M9 5l7 7-7 7"
											/>
										</svg>
									</div>
								</div>
							</div>
						</Link>
						{/* Hover gradient overlay */}
						<div className="absolute inset-0 bg-gradient-to-t from-neutral-900/0 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
					</article>
				))}
			</div>

			{products.length === 0 && (
				<div className="text-center py-20">
					<div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
						<svg
							className="w-12 h-12 text-neutral-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 8a3 3 0 016 0"
							/>
						</svg>
					</div>
					<p className="text-neutral-500 text-lg font-medium">
						No products found
					</p>
					<p className="text-neutral-400 text-sm mt-2">
						Try adjusting your search or filters
					</p>
				</div>
			)}

			{totalPages > 1 && (
				<nav className="flex justify-center items-center gap-2 pt-8">
					{currentPage > 1 && (
						<Link
							to={`?page=${currentPage - 1}`}
							className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300 transition-all duration-300 font-medium shadow-sm hover:shadow-md"
						>
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 19l-7-7 7-7"
								/>
							</svg>
							Previous
						</Link>
					)}

					<div className="flex gap-1">
						{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
							<Link
								key={page}
								to={`?page=${page}`}
								className={`w-12 h-12 rounded-xl flex items-center justify-center font-semibold transition-all duration-300 ${
									page === currentPage
										? "bg-neutral-900 text-white shadow-lg transform scale-105"
										: "bg-white hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300 shadow-sm hover:shadow-md"
								}`}
							>
								{page}
							</Link>
						))}
					</div>

					{currentPage < totalPages && (
						<Link
							to={`?page=${currentPage + 1}`}
							className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300 transition-all duration-300 font-medium shadow-sm hover:shadow-md"
						>
							Next
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</Link>
					)}
				</nav>
			)}
		</div>
	);
}
