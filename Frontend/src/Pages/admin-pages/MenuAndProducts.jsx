import React, { useEffect, useState } from "react";
import api from "../../api";

function ProductList() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get("/firstapp/products/")
      .then((res) => {
        setProducts(res.data);
      })
      .catch((err) => {
        console.error(err);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
      });
  }, []);

  return (
    <div>
      <h1>Product List</h1>

      {products.length === 0 && <p>No products found.</p>}

      <ul>
        {products.map((p) => (
          <li key={p.id}>
            <h3>{p.product_name}</h3>
            <p>{p.category}</p>
            <strong>₱{p.price}</strong>
            <strong>{p.stock_quantity}</strong>
            <p>{p.date_added}</p>
            {/* {p.image && (
              <img
                src={`http://127.0.0.1:8000${p.image}`}
                alt={p.name}
                width="150"
              />
            )} */}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ProductList;
