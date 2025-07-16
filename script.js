const API_BASE = 'https://script.google.com/macros/s/AKfycbzHjxC1yPIr7oKSYiNCkHKmSlvNhXGfaUADsDag4jCl9boNicwPdJSjusoy9IWR3wzw/exec';

let customersData = [];
let productsData = [];

async function loadJSON(url) {
  const response = await fetch(url);
  return response.json();
}

async function initForm() {
  const [customers, reps, visitTypes, products, purposes, outcomes] = await Promise.all([
    loadJSON('data/customers_main.json'),
    loadJSON('data/sales_representatives.json'),
    loadJSON('data/visit_types.json'),
    loadJSON('data/products_data.json'),
    loadJSON('data/visit_purposes.json'),
    loadJSON('data/visit_outcomes.json')
  ]);

  customersData = customers;
  productsData = products;

  // تعبئة المندوبين
  const salesRep = document.getElementById('salesRep');
  reps.forEach(rep => {
    let option = document.createElement('option');
    option.value = rep.Sales_Rep_Name_AR;
    option.textContent = rep.Sales_Rep_Name_AR;
    salesRep.appendChild(option);
  });

  // تعبئة العملاء
  const customerSelect = document.getElementById('customer');
  customers.forEach(cust => {
    let option = document.createElement('option');
    option.value = cust.Customer_Name_AR;
    option.textContent = cust.Customer_Name_AR;
    customerSelect.appendChild(option);
  });

  // البحث داخل العملاء
  document.getElementById('customerSearch').addEventListener('input', function () {
    const searchTerm = this.value.trim().toLowerCase();
    customerSelect.innerHTML = "";
    customers
      .filter(c => c.Customer_Name_AR.toLowerCase().includes(searchTerm))
      .forEach(cust => {
        let option = document.createElement('option');
        option.value = cust.Customer_Name_AR;
        option.textContent = cust.Customer_Name_AR;
        customerSelect.appendChild(option);
      });
  });

  // تعبئة أنواع الزيارة
  const visitType = document.getElementById('visitType');
  visitTypes.forEach(type => {
    let option = document.createElement('option');
    option.value = type.Visit_Type_Name_AR;
    option.textContent = type.Visit_Type_Name_AR;
    visitType.appendChild(option);
  });

  // تعبئة الغرض
  const purpose = document.getElementById('purpose');
  purposes.forEach(p => {
    let option = document.createElement('option');
    option.value = p;
    option.textContent = p;
    purpose.appendChild(option);
  });

  // تعبئة النتائج
  const outcome = document.getElementById('outcome');
  outcomes.forEach(out => {
    let option = document.createElement('option');
    option.value = out;
    option.textContent = out;
    outcome.appendChild(option);
  });

  // تعبئة التصنيفات
  const category = document.getElementById('category');
  const uniqueCategories = [...new Set(products.map(p => p.Category))];
  uniqueCategories.push('عام'); // لإظهار الكل
  uniqueCategories.forEach(cat => {
    let option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    category.appendChild(option);
  });

  category.addEventListener('change', () => {
    const selected = category.value;
    const filtered = selected === 'عام' ? productsData : productsData.filter(p => p.Category === selected);
    displayProducts(filtered);
  });
}

function displayProducts(products) {
  const section = document.getElementById('products-section');
  section.innerHTML = "<h4>الأصناف تحت التصنيف المختار:</h4>";
  products.forEach(prod => {
    let div = document.createElement('div');
    div.className = 'product-item';
    div.innerHTML = `
      <span>${prod.Product_Name_AR}</span>
      <label><input type="radio" name="product-${prod.Product_Name_AR}" value="متوفر"> متوفر</label>
      <label><input type="radio" name="product-${prod.Product_Name_AR}" value="غير متوفر"> غير متوفر</label>
    `;
    section.appendChild(div);
  });
}

document.getElementById('visit-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const formData = {
    Visit_Type_Name_AR: document.getElementById('visitType').value,
    Entry_User_Name: document.getElementById('entryUser').value,
    Sales_Rep_Name_AR: document.getElementById('salesRep').value,
    Customer_Name_AR: document.getElementById('customer').value,
    Product_Name_AR: document.getElementById('mainProduct').value || '',
    Visit_Purpose: document.getElementById('purpose').value,
    Visit_Outcome: document.getElementById('outcome').value,
    Notes: document.getElementById('notes').value || '',
    Available_Products_Names: [],
    Unavailable_Products_Names: []
  };

  // تجميع حالة المنتجات
  const radios = document.querySelectorAll('#products-section input[type="radio"]');
  radios.forEach(radio => {
    if (radio.checked) {
      const name = radio.name.replace('product-', '');
      if (radio.value === 'متوفر') formData.Available_Products_Names.push(name);
      else formData.Unavailable_Products_Names.push(name);
    }
  });

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: { "Content-Type": "application/json" }
    });
    const result = await res.json();
    document.getElementById('status').textContent = result.message || '✅ تم الإرسال بنجاح';
    this.reset();
  } catch (error) {
    document.getElementById('status').textContent = `❌ حدث خطأ أثناء الإرسال: ${error.message}`;
  }
});

initForm();
