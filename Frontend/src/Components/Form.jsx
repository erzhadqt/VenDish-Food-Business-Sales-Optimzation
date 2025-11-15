import { useState } from "react";

import { FaArrowLeft } from "react-icons/fa";

import api from "../api"
import { useNavigate, NavLink } from "react-router-dom"
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";

function Form({ route, method }) {
	const [username, setUsername] = useState("")
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [loading, setLoading] = useState(false)
	const navigate = useNavigate()

	const name = method === "login" ? "Log In" : "Sign Up"
	const name2 = method === "login" ? "Welcome!" : "Create an Account"

	const handleSubmit = async (e) => {
		setLoading(true)
		e.preventDefault()

		try {
			if (method === "login") {
				const res = await api.post(route, { username, password })
				localStorage.setItem(ACCESS_TOKEN, res.data.access);
				localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
				navigate("/admin")
			}

			else if (method === "signup") {
				const res = await api.post(route, { username, email, password })
				console.log(res)
				navigate("/login")
			}

			else {
				navigate("/login")
			}
		} catch (error) {
			alert(error)
		} finally {
			setLoading(false)
		}
	};

	return (
		<div className="bg-[linear-gradient(to_right,#121212,#454545,#787878)] min-h-screen">
			<h2 className="text-3xl font-bold text-white mb-6 pt-7 text-center">
				{name}
			</h2>
			<div className="relative bg-white shadow-2xl w-full max-w-xl p-10 pt-5 flex flex-col rounded border-l border-blue-200 mx-auto items-center">

				<span className="text-center font-bold text-lg mb-3">
					{name2}
				</span>


				<form onSubmit={handleSubmit} className="">
					<div className="flex flex-col gap-y-1 mb-2 w-100 ">
						<label className="font-bold text-gray-500">Username</label>
						<input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="font-semibold outline-gray-500 py-2 px-3 rounded border-2 border-gray-500 focus:border-black " required />
					</div>

					{method === "signup" && (
						<div className="flex flex-col gap-y-1 mb-2 w-100">
							<label className="font-bold text-gray-500">Email</label>
							<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="font-semibold outline-gray-500 py-2 px-3 rounded border-2 border-gray-500 focus:border-black" required />
						</div>
					)}

					<div className="flex flex-col gap-y-1 mb-2 w-100">
						<label className="font-bold text-gray-500">Password</label>
						<input type="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} className="font-semibold outline-gray-500 py-2 px-3 rounded border-2 border-gray-500 focus:border-black" required />
					</div>

					{method === "signup" && (
						<div className="flex flex-col gap-y-1 mb-2 w-100">
							<label className="font-bold text-gray-500">Confirm Password</label>
							<input type="password" name="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="font-semibold outline-gray-500 py-2 px-3 rounded border-2 border-gray-500 focus:border-black" required />
						</div>
					)}

					{method === "signup" && (
						<div className="flex flex-col gap-y-1 w-100">
							<p className="text-sm text-center">By Creating an account, you AGREE to our <span className="text-blue-500">Terms</span> and have read and acknowledge the Kuya Vince <span className="text-red-600">KARINDERYA</span></p>
						</div>
					)

					}


					<button type="submit" className="w-full bg-[linear-gradient(to_right,#D91616,#FF4D50)] hover:bg-[linear-gradient(to_right,#FF4D50,#D91616)] text-white font-semibold py-2 rounded-lg transition-all duration-300 mt-4 cursor-pointer">
						{name}
					</button>

					{
						method === "login" ? (
							<p className="text-center text-sm text-gray-700 mt-4">
								Don’t have an account?{" "}
								<button onClick={() => navigate("/signup")} type="button" className="text-blue-700 font-medium hover:underline">
									Sign Up
								</button>
							</p>
						) : (
							<p className="text-center text-sm text-gray-700 mt-4">
								Already have an account?{" "}
								<button onClick={() => navigate("/login")} type="button" className="text-blue-700 font-medium hover:underline">
									Log In
								</button>
							</p>
						)
					}



				</form>
				<NavLink
					to={"/"}
					className="absolute bottom-4 left-4 flex items-center gap-2 text-black hover:text-blue-500 transition-colors duration-200 sm:bottom-6 sm:left-6"
				>
					<FaArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
					<span className="font-semibold text-base sm:text-lg">Back</span>
				</NavLink>

			</div>
		</div>

	)

}

export default Form