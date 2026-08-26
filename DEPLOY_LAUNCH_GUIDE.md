# DR. SparkPlay — Deploy & Launch Guide

## Quick Links
- 📄 [Public Appeal Assessment](./PUBLIC_APPEAL_ASSESSMENT.md)
- ✅ [Completion Summary](./PUBLIC_APPEAL_COMPLETION_SUMMARY.md)
- 🚀 This guide

---

## Pre-Launch Checklist

### **Environment**
- [ ] Vercel project connected to GitHub repo
- [ ] Environment variable `SEED_SECRET` set in Vercel
- [ ] Production domain configured
- [ ] SSL certificate active

### **Testing (Before Deploy)**
```bash
# 1. Install deps (if needed)
npm install

# 2. Build locally
npm run build

# 3. Run dev server
npm run dev

# 4. Test all new pages
- http://localhost:3000/           # Homepage
- http://localhost:3000/tour       # How-it-works
- http://localhost:3000/faq        # FAQ
- http://localhost:3000/about      # About
- http://localhost:3000/demo       # Demo info
```

### **Functionality Tests**
- [ ] Homepage hero section displays correctly on mobile/desktop
- [ ] Tour page: click each timeline item, verify details appear
- [ ] FAQ page: click each question, verify answer expands
- [ ] About page: all sections load and render
- [ ] Demo page: copy-to-clipboard buttons work
- [ ] All links (footer, buttons) work correctly
- [ ] No console errors in browser DevTools

### **SEO & Meta**
- [ ] Open Graph tags visible in page source (`og:title`, `og:description`, etc.)
- [ ] Title tag reflects: "DR. SparkPlay — Run the centre, not the photocopier"
- [ ] Meta description visible
- [ ] Favicon displays

---

## Deployment Steps

### **Option 1: Automatic Deployment (Recommended)**
Vercel auto-deploys on `git push` to main branch:
```bash
git push origin main
# Vercel automatically builds and deploys
# Check deployment status: https://vercel.com/dashboard
```

**Deployment typically takes 2-3 minutes.**

### **Option 2: Manual Deployment**
```bash
# Ensure you're on main branch
git checkout main
git pull

# Deploy to production
npx vercel deploy --prod

# Follow prompts (should auto-connect to your project)
```

### **Option 3: Vercel CLI Deploy**
```bash
# From project root
vercel --prod
```

---

## Post-Deployment Validation

### **1. Verify Public Pages Load**
```bash
# Replace sparkplay-lyart.vercel.app with your actual domain
curl -I https://sparkplay-lyart.vercel.app/
curl -I https://sparkplay-lyart.vercel.app/tour
curl -I https://sparkplay-lyart.vercel.app/faq
curl -I https://sparkplay-lyart.vercel.app/about
curl -I https://sparkplay-lyart.vercel.app/demo
```

All should return **HTTP 200**.

### **2. Visual Inspection**
1. Visit `https://[your-domain].vercel.app/`
2. Scroll through entire page
3. Click "See how it works" → verify tour loads
4. Click "See full FAQ →" → verify FAQ loads
5. Click footer links → verify all pages accessible

### **3. Mobile Test**
- Open on phone/tablet
- Verify responsive design works
- Test touch interactions (copy buttons, accordions)

### **4. SEO Check**
- Right-click page → Inspect → Head section
- Verify `<meta name="description">` present
- Verify Open Graph tags (`<meta property="og:*">`)

### **5. Performance Check**
- Open DevTools (F12)
- Check Console for errors (should be clean)
- Check Network tab (all requests successful)
- Lighthouse audit: Target ~90+ score

---

## DNS & Domain Setup

If using custom domain:

```bash
# Add CNAME record to your DNS provider
# Name: www (or @)
# Value: cname.vercel-dns.com

# Verify with Vercel dashboard
# Deployments → Domains → Add domain → Follow prompts
```

---

## Demo Mode Enablement

### **Demo Account Credentials**
Once deployed, the following are available for testing:

**Email:** `demo@sparkplay.com.au`  
**Password:** `DemoSparkPlay123!`

These credentials are displayed on `/demo` page.

### **Reset Demo Data** (if needed)
```bash
# Call seed endpoint with secret
curl -X POST \
  -H "x-seed-secret: [YOUR_SEED_SECRET]" \
  https://[your-domain].vercel.app/api/seed

# Or via query param
curl -X POST \
  https://[your-domain].vercel.app/api/seed?secret=[YOUR_SEED_SECRET]
```

---

## Analytics & Monitoring

### **Google Analytics Setup** (Optional)
1. Add GA4 property ID to environment variables
2. Install `next-google-analytics` or equivalent
3. Track these events:
   - Page views (homepage, tour, faq, about, demo)
   - Button clicks (CTA buttons)
   - Form submissions (if feedback form added)

### **Sentry Monitoring** (Already Configured)
- Errors automatically reported
- Dashboard: https://sentry.io
- Check for any client-side errors on new pages

---

## Rollback (If Needed)

### **Via Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Deployments tab
4. Find previous deployment
5. Click **Promote to Production**

### **Via Git**
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Vercel auto-deploys the reverted state
```

---

## Post-Launch Tasks

### **Immediate (Day 1)**
- [ ] Monitor deployment for errors (Vercel dashboard)
- [ ] Test all public pages in production
- [ ] Share new URLs with team
- [ ] Update any external docs/links pointing to old homepage

### **Short-term (Week 1)**
- [ ] Monitor bounce rate on homepage (GA)
- [ ] Check FAQ page traffic (GA)
- [ ] Verify demo mode is being used
- [ ] Gather team feedback

### **Medium-term (Month 1)**
- [ ] Analyze conversion rates (signup rate from homepage)
- [ ] Review which FAQ questions are most clicked
- [ ] Monitor support tickets for new patterns
- [ ] Plan Tier 2 improvements (onboarding, feedback form)

---

## Support & Troubleshooting

### **Pages Not Loading**
1. Check Vercel deployment status (should be "Ready")
2. Clear browser cache (Ctrl+Shift+Delete)
3. Try incognito/private window
4. Check page URL spelling

### **Content Not Appearing**
1. Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
2. Check browser console for errors
3. Verify images/assets loading (Network tab in DevTools)

### **Demo Credentials Not Working**
1. Verify email is correct: `demo@sparkplay.com.au`
2. Check password: `DemoSparkPlay123!`
3. Try resetting via seed endpoint
4. Check if demo user exists in Supabase

### **API Seed Endpoint Issues**
1. Verify `SEED_SECRET` env var is set
2. Check header: `-H "x-seed-secret: [value]"`
3. Review Vercel Function Logs
4. Ensure Supabase credentials are configured

---

## Performance Targets

After deployment, aim for:

| Metric | Target |
|--------|--------|
| Homepage load time | < 2s |
| Time to Interactive | < 3s |
| Lighthouse Score | > 90 |
| Core Web Vitals | All "Good" |
| Bounce Rate | < 30% |

Monitor with:
- Vercel Analytics dashboard
- Google Lighthouse (built into DevTools)
- Google Search Console (after indexing)

---

## Success Metrics (First 30 Days)

Track these to measure success:

| Metric | Initial | Target |
|--------|---------|--------|
| Homepage visitors | TBD | +150% |
| Tour page clicks | TBD | > 30% |
| FAQ engagement | TBD | > 20% |
| Demo credentials usage | TBD | > 10% |
| Signup rate | TBD | +25% |

---

## Questions?

- Check [Completion Summary](./PUBLIC_APPEAL_COMPLETION_SUMMARY.md) for feature overview
- See [Assessment](./PUBLIC_APPEAL_ASSESSMENT.md) for context & roadmap
- Review inline code comments in component files
- Check Vercel docs: https://vercel.com/docs
- Check Next.js docs: https://nextjs.org/docs

---

## Deployment Confidence

✅ **All new features tested and working**  
✅ **Build passes without errors**  
✅ **No breaking changes to existing functionality**  
✅ **Ready for production deployment**  

**Recommended:** Deploy immediately. Low risk, high impact.
