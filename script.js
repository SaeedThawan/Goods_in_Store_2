document.addEventListener('DOMContentLoaded', () => {
    // جلب عناصر HTML بواسطة معرفاتها (IDs)
    const employeeNameInput = document.getElementById('employeeName');
    const agentSelect = document.getElementById('agentSelect');
    const customerSearchInput = document.getElementById('customerSearch');
    const customerSelect = document.getElementById('customerSelect');
    const customerTypeSelect = document.getElementById('customerTypeSelect'); // قائمة نوع العميل
    const productsContainer = document.getElementById('productsContainer');
    const submitBtn = document.getElementById('submitBtn');
    const responseMessage = document.getElementById('responseMessage');

    // متغيرات لتخزين البيانات التي سيتم جلبها من ملفات JSON
    let agents = [];
    let customers = [];
    let productsByCategory = {}; // ستحتوي على المنتجات مصنفة حسب الفئة

    // ** هام: رابط Google Apps Script Web App **
    // ستستبدل هذا الرابط بعد نشر مشروعك في Google Apps Script
    const GOOGLE_SHEET_WEB_APP_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE'; 

    // تعريف فئات المنتجات للفلترة
    // هذه الفئات يجب أن تتطابق مع الفئات في products.json
    const FOOD_CATEGORIES = ["المشروبات", "5فايف ستار", "تيارا", "البسكويت"]; 
    const DESSERT_CATEGORIES = ["الحلويات", "الشوكولاتة"]; 
    // كلمات مفتاحية للتعرف على عملاء التجميل من أسمائهم
    const COSMETICS_KEYWORDS = ["تجميل", "بيوتي", "Beauty", "Cosmetics"]; 

    // ----------------------------------------------------
    // وظائف جلب البيانات من ملفات JSON
    // ----------------------------------------------------
    async function fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) { // التحقق إذا كان الاستجابة ناجحة (كود حالة 200 OK)
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json(); // تحليل الاستجابة كـ JSON
        } catch (error) {
            console.error('Error fetching data:', error);
            responseMessage.className = 'error';
            responseMessage.textContent = `فشل في تحميل البيانات الأساسية: ${error.message}. تأكد من وجود ملفات JSON في نفس المجلد.`;
            // إرجاع كائن/مصفوفة فارغة لمنع الأخطاء اللاحقة
            return url.includes('products.json') ? {} : []; 
        }
    }

    // وظيفة تحميل جميع البيانات عند بدء تشغيل التطبيق
    async function loadAllData() {
        // جلب البيانات من الملفات المحلية
        agents = await fetchData('agents.json');
        customers = await fetchData('customers.json');
        productsByCategory = await fetchData('products.json');

        // تعبئة القوائم وعرض المنتجات بعد تحميل البيانات
        populateAgents();
        populateCustomers(customers); // تعبئة قائمة العملاء في البداية بجميع العملاء
        renderProducts(); // عرض المنتجات (في البداية بناءً على الإعداد الافتراضي لنوع العميل)
    }

    // ----------------------------------------------------
    // وظائف بناء الواجهة وتحديثها
    // ----------------------------------------------------

    // تعبئة قائمة المندوبين المنسدلة
    function populateAgents() {
        agentSelect.innerHTML = '<option value="">-- اختر مندوبًا --</option>'; // إضافة خيار افتراضي
        agents.forEach(agent => {
            const option = document.createElement('option');
            option.value = agent;
            option.textContent = agent;
            agentSelect.appendChild(option);
        });
    }

    // تعبئة قائمة العملاء المنسدلة (مع دعم الفلترة/البحث)
    function populateCustomers(filteredCustomers) {
        customerSelect.innerHTML = ''; // مسح الخيارات الموجودة
        if (filteredCustomers.length === 0) { // إذا لم يكن هناك عملاء مطابقون
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "لا يوجد عملاء مطابقون";
            customerSelect.appendChild(option);
            return;
        }
        filteredCustomers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer;
            option.textContent = customer;
            customerSelect.appendChild(option);
        });
    }

    // ----------------------------------------------------
    // معالجة الأحداث (Event Listeners)
    // ----------------------------------------------------

    // فلترة قائمة العملاء عند الكتابة في حقل البحث
    customerSearchInput.addEventListener('input', () => {
        const searchTerm = customerSearchInput.value.toLowerCase();
        // فلترة العملاء الذين تتضمن أسماؤهم مصطلح البحث
        const filtered = customers.filter(customer => customer.toLowerCase().includes(searchTerm));
        populateCustomers(filtered);
    });

    // عند اختيار عميل من القائمة المنسدلة، ضع اسمه في حقل البحث ليتضح للمستخدم
    customerSelect.addEventListener('change', () => {
        if (customerSelect.value) {
            customerSearchInput.value = customerSelect.value;
            // محاولة تحديد نوع العميل تلقائيًا بناءً على اسم العميل
            const selectedCustomerName = customerSelect.value.toLowerCase();
            let detectedType = 'عام'; // الافتراضي هو "عام"

            if (selectedCustomerName.includes('غذائية') || selectedCustomerName.includes('فود')) {
                detectedType = 'غذائية';
            } else if (selectedCustomerName.includes('حلويات') || selectedCustomerName.includes('سويت')) {
                detectedType = 'حلويات';
            } else if (COSMETICS_KEYWORDS.some(keyword => selectedCustomerName.includes(keyword.toLowerCase()))) {
                detectedType = 'تجميل';
            }
            customerTypeSelect.value = detectedType; // تعيين نوع العميل المكتشف
            renderProducts(); // إعادة عرض المنتجات بناءً على النوع المكتشف
        } else {
            customerSearchInput.value = ''; // مسح حقل البحث إذا لم يتم اختيار عميل
            customerTypeSelect.value = ''; // مسح نوع العميل
            renderProducts(); // إعادة عرض جميع المنتجات (أو الحالة الافتراضية)
        }
    });

    // عند تغيير نوع العميل، قم بإعادة عرض المنتجات
    customerTypeSelect.addEventListener('change', () => {
        renderProducts();
    });

    // عرض المنتجات بناءً على الفئات المختارة ونوع العميل
    function renderProducts() {
        productsContainer.innerHTML = ''; // مسح المحتوى الحالي
        const selectedCustomerType = customerTypeSelect.value; // جلب نوع العميل المختار
        let productsToDisplay = {}; // كائن لتخزين المنتجات التي سيتم عرضها

        // منطق فلترة المنتجات بناءً على نوع العميل
        if (selectedCustomerType === 'غذائية') {
            FOOD_CATEGORIES.forEach(category => {
                if (productsByCategory[category]) {
                    productsToDisplay[category] = productsByCategory[category];
                }
            });
        } else if (selectedCustomerType === 'حلويات') {
            DESSERT_CATEGORIES.forEach(category => {
                if (productsByCategory[category]) {
                    productsToDisplay[category] = productsByCategory[category];
                }
            });
        } else { // 'تجميل' أو 'عام' أو لا يوجد اختيار، عرض جميع المنتجات
            productsToDisplay = productsByCategory;
        }

        // عرض المنتجات في الواجهة
        for (const category in productsToDisplay) {
            if (productsToDisplay.hasOwnProperty(category)) {
                const categoryGroup = document.createElement('div');
                categoryGroup.className = 'category-group';
                categoryGroup.innerHTML = `<h3>${category}</h3>`; // عنوان الفئة

                productsToDisplay[category].forEach(product => {
                    const productItem = document.createElement('div');
                    productItem.className = 'product-item';
                    productItem.innerHTML = `
                        <label>${product}</label>
                        <div class="radio-group">
                            <input type="radio" id="${product}-available" name="${product}" value="موجود" checked>
                            <label for="${product}-available">موجود</label>
                            <input type="radio" id="${product}-not-available" name="${product}" value="غير موجود">
                            <label for="${product}-not-available">غير موجود</label>
                        </div>
                    `;
                    categoryGroup.appendChild(productItem);
                });
                productsContainer.appendChild(categoryGroup);
            }
        }
    }

    // ----------------------------------------------------
    // وظيفة إرسال البيانات إلى Google Apps Script
    // ----------------------------------------------------
    submitBtn.addEventListener('click', async () => {
        // جلب البيانات من حقول النموذج
        const employeeName = employeeNameInput.value;
        const agentName = agentSelect.value;
        const customerName = customerSelect.value;
        const customerType = customerTypeSelect.value; // جلب نوع العميل المختار

        // التحقق من أن جميع الحقول المطلوبة مملوءة
        if (!employeeName || !agentName || !customerName || !customerType) {
            responseMessage.className = 'error';
            responseMessage.textContent = 'الرجاء ملء جميع الحقول المطلوبة (اسم الموظف، المندوب، العميل، ونوع العميل).';
            return; // إيقاف العملية إذا كانت هناك حقول فارغة
        }

        const availableProducts = [];
        const notAvailableProducts = [];
        // جلب جميع أزرار الراديو التي تم تحديدها
        const productRadios = productsContainer.querySelectorAll('input[type="radio"]:checked');

        productRadios.forEach(radio => {
            const productName = radio.name; // اسم المنتج هو نفسه اسم مجموعة الراديو
            if (radio.value === 'موجود') {
                availableProducts.push(productName);
            } else {
                notAvailableProducts.push(productName);
            }
        });

        // الحصول على الوقت والتاريخ الحاليين
        const now = new Date();
        const timestampDate = now.toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const timestampTime = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

        // بناء كائن البيانات لإرساله إلى Google Apps Script
        const formData = {
            Timestamp_Date: timestampDate,
            Timestamp_Time: timestampTime,
            Employee_Name: employeeName,
            Agent_Name: agentName,
            Customer_Name: customerName,
            Customer_Type: customerType, // حقل جديد: نوع العميل
            Products_Available: JSON.stringify(availableProducts), // إرسالها كسلسلة JSON
            Products_Not_Available: JSON.stringify(notAvailableProducts) // إرسالها كسلسلة JSON
        };

        try {
            responseMessage.className = 'message';
            responseMessage.textContent = 'جارٍ إرسال البيانات...';

            // إرسال البيانات إلى Google Apps Script باستخدام Fetch API
            // استخدام 'no-cors' لتجنب مشاكل CORS المعقدة مع Google Apps Script من الواجهة الأمامية
            const response = await fetch(GOOGLE_SHEET_WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors', // مهم للسماح بالطلبات العابرة للمجالات
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded', // نوع المحتوى للبيانات المرسلة
                },
                body: new URLSearchParams(formData).toString(), // تحويل الكائن إلى سلسلة URL-encoded
            });

            // نظرًا لاستخدام 'no-cors'، لا يمكننا قراءة استجابة حقيقية من الخادم هنا
            // لذلك، نفترض النجاح إذا لم يحدث خطأ في الشبكة.
            responseMessage.className = 'success';
            responseMessage.textContent = 'تم إرسال البيانات بنجاح!';
            
            // مسح الحقول وإعادة تهيئة الواجهة بعد الإرسال الناجح
            employeeNameInput.value = '';
            agentSelect.value = '';
            customerSearchInput.value = '';
            customerSelect.innerHTML = ''; 
            customerTypeSelect.value = '';
            populateCustomers(customers); // إعادة تعبئة قائمة العملاء بجميع العملاء
            renderProducts(); // إعادة تعيين المنتجات إلى الحالة الافتراضية

        } catch (error) {
            console.error('خطأ في إرسال البيانات:', error);
            responseMessage.className = 'error';
            responseMessage.textContent = `حدث خطأ أثناء الإرسال: ${error.message}. الرجاء التحقق من رابط Google Apps Script الخاص بك.`;
        }
    });

    // تحميل جميع البيانات عند تحميل الصفحة لأول مرة
    loadAllData();
});