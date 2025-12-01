import React, { useState, useEffect } from "react";
import {
  TicketPercentIcon,
  PlusSquareIcon,
  Loader2,
  Calendar,
  AlertCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "../../api";
import AddDiscountDialog from "../../Components/AddDiscountDialog";

const PromoManagement = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  const fetchCoupons = async () => {
	try {
	  const response = await api.get("/firstapp/coupons/");
	  const data = response.data;
	  setCoupons(data);
	} catch (err) {
	  setError(err.message);
	} finally {
	  setLoading(false);
	}
  };

  useEffect(() => {
	fetchCoupons();
  }, []);

  const handleDelete = async (id) => {
	if (!window.confirm("Are you sure you want to delete this coupon?")) return;

	try {
	  await api.delete(`/firstapp/coupons/${id}/`);
	  setCoupons((prev) => prev.filter((coupon) => coupon.id !== id));
	  
	  if (paginatedCoupons.length === 1 && currentPage > 1) {
		setCurrentPage(prev => prev - 1);
	  }
	} catch (err) {
	  console.error("Delete error:", err);
	  alert("Failed to delete coupon. It may have already been deleted.");
	}
  };

  const formatDate = (dateString) => {
	return new Date(dateString).toLocaleDateString("en-US", {
	  year: "numeric",
	  month: "short",
	  day: "numeric",
	});
  };

  const renderStatusBadge = (status) => {
	const currentStatus = status ? status.toLowerCase() : "";

	switch (currentStatus) {
	  case "active":
		return (
		  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
			Active
		  </span>
		);
	  case "claimed":
		return (
		  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
			Claimed
		  </span>
		);
	  case "redeemed":
		return (
		  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
			Redeemed
		  </span>
		);
	  default:
		return (
		  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
			{status}
		  </span>
		);
	}
  };

  const totalPages = Math.ceil(coupons.length / rowsPerPage);

  console.log(totalPages)

  const paginatedCoupons = coupons.slice(
	(currentPage - 1) * rowsPerPage,
	currentPage * rowsPerPage
  );

  console.log('Paginated Coupons: ', paginatedCoupons)

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () =>
	setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  return (
	<div className="w-full p-6">
	  <div className="max-w-7xl mx-auto">
		<nav className="flex items-center justify-between mb-8">
		  <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
			<TicketPercentIcon size={30} className="text-blue-600" />
			Promo Discounts
		  </h1>

		  <div className="flex gap-2">
			<AddDiscountDialog onSaved={fetchCoupons}>
			  <button className="flex gap-2 items-center bg-gray-900 hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-sm">
				<PlusSquareIcon size={20} /> New Coupon
			  </button>
			</AddDiscountDialog>
		  </div>
		</nav>

		<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
		  {loading && (
			<div className="p-12 flex justify-center items-center text-gray-500">
			  <Loader2 size={32} className="animate-spin mr-2" /> Loading
			  coupons...
			</div>
		  )}

		  {error && (
			<div className="p-8 text-center text-red-500 bg-red-50">
			  <AlertCircle className="mx-auto mb-2" />
			  <p>Error: {error}</p>
			</div>
		  )}

		  {!loading && !error && (
			<>
			  <div className="overflow-x-auto">
				<table className="w-full text-left border-collapse">
				  <thead className="bg-gray-50 text-gray-600 font-semibold text-sm uppercase tracking-wider">
					<tr>
					  <th className="p-4 border-b">Details</th>
					  <th className="p-4 border-b">Code</th>
					  <th className="p-4 border-b">Discount</th>
					  <th className="p-4 border-b">Product</th>
					  <th className="p-4 border-b">Status</th>
					  <th className="p-4 border-b">Expiration</th>
					  <th className="p-4 border-b text-right">Actions</th>
					</tr>
				  </thead>
				  <tbody className="divide-y divide-gray-100">
					{paginatedCoupons.map((coupon) => (
					  <tr
						key={coupon.id}
						className="hover:bg-gray-50 transition-colors group"
					  >
						<td className="p-4">
						  <p className="font-medium text-gray-900">
							{coupon.name}
						  </p>
						</td>
						<td className="p-4">
						  <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-700 border border-gray-300">
							{coupon.code}
						  </span>
						</td>
						<td className="p-4 font-semibold text-green-600">
						  ${coupon.rate}
						</td>
						<td className="p-4 text-gray-600">
						  {coupon.product_name || `Product #${coupon.product}`}
						</td>
						<td className="p-4">
						  {renderStatusBadge(coupon.status)}
						</td>
						<td className="p-4 text-gray-500 text-sm flex items-center gap-2">
						  <Calendar size={14} />{" "}
						  {formatDate(coupon.expiration)}
						</td>
						<td className="p-4 text-right">
						  <button
							onClick={() => handleDelete(coupon.id)}
							className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
							title="Delete Coupon"
						  >
							<Trash2 size={18} />
						  </button>
						</td>
					  </tr>
					))}
				  </tbody>
				</table>
			  </div>

			  {coupons.length > 0 && (
				<div className="flex justify-end items-center gap-2 p-4 border-t border-gray-100">
				  <button
					onClick={handlePrevPage}
					disabled={currentPage === 1}
					className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
				  >
					<ChevronLeft size={20} className="text-gray-600" />
				  </button>
				  <span className="text-sm text-gray-600 font-medium">
					Page {currentPage} of {totalPages}
				  </span>
				  <button
					onClick={handleNextPage}
					disabled={currentPage === totalPages}
					className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
				  >
					<ChevronRight size={20} className="text-gray-600" />
				  </button>
				</div>
			  )}
			</>
		  )}

		  {!loading && coupons.length === 0 && (
			<div className="p-12 text-center text-gray-400">
			  No coupons found. Create one to get started!
			</div>
		  )}
		</div>
	  </div>
	</div>
  );
};

export default PromoManagement;