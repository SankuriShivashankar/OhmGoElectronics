OHMGO WEBSITE - HOW TO PUBLISH
==============================
Files (all inside the folder "ohmgo-site"):
  index.html  - the store page
  style.css   - design
  data.js     - the 3,100+ product catalog
  store.js    - storage, orders, coupons, delivery rule
  app.js      - customer store (login, cart, checkout, orders, reviews)
  admin.js    - owner admin panel (opens on the same page)
  logo.svg    - OhmGo logo

PUBLISH ON NETLIFY
  1. Go to https://app.netlify.com/drop
  2. Drag the folder "ohmgo-site" onto the page.
  3. Site settings > Change site name (for example: ohmgo).

OWNER / ADMIN
  - Open your website, scroll to the footer, click "Owner login"
    (or "Store owner? Log in here" on the customer login box).
  - First time: choose an admin password (8+ characters), owner email
    is ohmgoelectronics@gmail.com.
  - Tabs: Dashboard, Orders, Products (prices, photos, add projects),
    Discounts (delivery rule + coupons), Projects, Reviews, Customers, Settings.

RULES SET UP
  - Free delivery on orders of Rs 499 and above, Rs 49 below that
    (change in Admin > Discounts).
  - Orders are accepted automatically; customers can cancel until dispatch.

EMAIL ALERTS (new order, cancellation, customer visit)
  Admin > Settings > Email alerts: paste your EmailJS Service ID,
  Template ID and Public key (free at emailjs.com).

IMPORTANT LIMIT
  Data (orders, prices, photos, customers) is saved in the browser where it
  happens. To see customers' orders on your own phone/laptop, a shared online
  database (for example Firebase) must be connected. Until then use the
  email alerts and the WhatsApp button for orders.
