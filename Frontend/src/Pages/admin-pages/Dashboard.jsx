import React from "react";
import { FaChartLine, FaMoneyBillWave, FaBug, FaWallet, FaComments } from "react-icons/fa";

const Dashboard = () => {
  return (
    <div className="p-6 flex flex-col gap-6 min-h-screen">

      <div className="flex flex-wrap gap-6">
        <div className="flex-1 min-w-[250px] bg-white shadow-lg border border-gray-300 rounded-2xl flex flex-col justify-between">
          <div className="p-6 flex flex-col justify-between grow">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Top Sale Today</h2>
              <FaChartLine className="text-blue-500 text-2xl" />
            </div>
            <div className="mt-4">
              <h3 className="text-4xl font-bold text-gray-900">₱12,340</h3>
              <p className="text-sm text-gray-500 mt-2">+15% from yesterday</p>
            </div>
          </div>

          <div className="h-2 bg-red-500 rounded-b-2xl"></div>
        </div>


        <div className="flex-1 min-w-[250px] bg-white shadow-lg border border-gray-300 rounded-2xl flex flex-col justify-between">
          <div className="p-6 flex flex-col justify-between grow">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Total Sales</h2>
              <FaMoneyBillWave className="text-green-500 text-2xl" />
            </div>
            <div className="mt-4">
              <h3 className="text-4xl font-bold text-gray-900">₱256,780</h3>
              <p className="text-sm text-gray-500 mt-2">This month’s total revenue</p>
            </div>
          </div>

          <div className="h-2 bg-red-500 rounded-b-2xl"></div>
        </div>
      </div>


      <div className="flex flex-wrap gap-6">

        <div className="flex-1 min-w-[250px] bg-white shadow-lg border border-gray-300 rounded-2xl flex flex-col">
          <div className="p-6 flex flex-col grow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Problem Reports</h2>
              <FaBug className="text-red-500 text-2xl" />
            </div>
            <ul className="text-gray-700 text-sm space-y-2">
              <li>⚠️ The Service is bad</li>
              <li>⚠️ The water tastes weird</li>
              <li>⚠️ The cashier is not good looking</li>
            </ul>
          </div>

          <div className="h-2 bg-red-500 rounded-b-2xl"></div>
        </div>


        <div className="flex-1 min-w-[250px] bg-white shadow-lg border border-gray-300 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Finance Section</h2>
            <FaWallet className="text-yellow-500 text-2xl" />
          </div>
          <div className="text-gray-700 text-sm">
            <p>Total Budget: ₱500,000</p>
            <p>Expenses: ₱350,000</p>
            <p>Remaining: ₱150,000</p>
          </div>
        </div>


        <div className="flex-1 min-w-[250px] bg-white shadow-lg border border-gray-300 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Customer Feedback</h2>
            <FaComments className="text-purple-500 text-2xl" />
          </div>
          <ul className="text-gray-700 text-sm space-y-2">
            <li>“The food was so delicious” ⭐⭐⭐⭐⭐</li>
            <li>“Fast response to issues.” ⭐⭐⭐⭐</li>
            <li>“Good value for money.” ⭐⭐⭐⭐</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
