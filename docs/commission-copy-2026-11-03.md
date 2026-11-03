# Unified commission entry copy

Desktop/mobile shared navigation now says سفارش نقاشی و دفتر (Custom art & notebooks). The shared commission hero explicitly introduces artwork or a personal notebook and explains painting style vs notebook size/paper/cover options. The previous ready-artworks hero action is now سفارش دفتر سفارشی; it reveals the notebook branch and scrolls to the request form.

Guests entering the notebook branch from the shared page return after login to the canonical notebook entry. Authentication return validation now explicitly allows known notebook root/SKU/checkout paths and the notebook-request fragment only; arbitrary destinations and fragments stay rejected.

8 focused commission/notebook tests and production build passed. Frontend-only local/server release: /srv/nilart/releases/commissions-copy-20261103. No orders, product prices or campaign data changed.
