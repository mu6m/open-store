import { Form, useNavigate } from "@remix-run/react";
import { SignInButton, useUser } from "@clerk/remix";

export default function Navbar() {
	const navigate = useNavigate();
	const { isSignedIn, user } = useUser();

	const handleSearch = (event: any) => {
		event.preventDefault();
		const searchTerm = event.target.search.value;
		navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
	};

	return (
		<nav className="flex flex-col md:flex-row w-full justify-center content-center max-w-6xl mx-auto px-4 items-center my-8 gap-4">
			<div className="w-full flex gap-4 items-center sm:justify-start">
				<div className="hidden lg:flex">
					<a href="/" className="text-xl font-bold">
						openstore
					</a>
				</div>

				<div className="flex-1 w-full mx-4">
					<Form onSubmit={handleSearch} className="relative">
						<input
							type="search"
							name="search"
							placeholder="search..."
							className="w-full px-4 py-2 rounded-sm border focus:outline-none focus:ring-2 shadow-md focus:ring-blue-500"
						/>
					</Form>
				</div>
				<div className="flex items-start space-x-4">
					{!isSignedIn ? (
						<SignInButton mode="modal">
							<button className="bg-blue-500 hover:bg-blue-600 whitespace-nowrap text-white px-2 py-1 rounded-sm">
								login
							</button>
						</SignInButton>
					) : (
						<div className="flex items-center space-x-4 gap-4 whitespace-nowrap">
							<div className="flex flex-col md:flex-row gap-4">
								<a
									href="/user/"
									className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-sm"
								>
									account
								</a>
								<a
									href="/cart/"
									className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-sm whitespace-nowrap"
								>
									cart
								</a>
							</div>
						</div>
					)}
				</div>
			</div>
		</nav>
	);
}
