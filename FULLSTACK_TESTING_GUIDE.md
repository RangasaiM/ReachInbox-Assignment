# 🚀 Full-Stack Testing Guide - InboxSync

## 📋 **Overview**

This guide will help you test the complete InboxSync application with both frontend (React) and backend (Node.js/Express) working together.

## 🏗️ **Architecture**

```
Frontend (React + Vite)     Backend (Node.js + Express)
     ↓                              ↓
Port 5173                    Port 3000
     ↓                              ↓
  API Calls → → → → → → → → → Elasticsearch
                              IMAP Sync
                              AI Categorization
                              Webhook Notifications
```

## 🧪 **Testing Methods**

### **Method 1: Automated Full-Stack Test**

```bash
# Run the comprehensive test
node test-fullstack.js
```

This will:
- ✅ Start both frontend and backend servers
- ✅ Test all API endpoints
- ✅ Verify CORS configuration
- ✅ Check frontend accessibility
- ✅ Provide detailed test results

### **Method 2: Manual Testing**

#### **Step 1: Start Backend**
```bash
cd backend
npm run dev
```

**Expected Output:**
```
Server running on port 3000
✅ Elasticsearch index created: emails
✅ Connected to Gmail IMAP: your-email@gmail.com
👂 Listening for new emails via IDLE
```

#### **Step 2: Start Frontend**
```bash
cd frontend
npm run dev
```

**Expected Output:**
```
  VITE v7.1.7  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

#### **Step 3: Test in Browser**
1. Open http://localhost:5173
2. You should see the "ReachInbox Onebox" interface
3. Test the following features:

## 🎯 **Frontend Features to Test**

### **1. Email Search**
- ✅ Search by keywords
- ✅ Filter by account
- ✅ Filter by folder
- ✅ Clear filters

### **2. Email Display**
- ✅ Email list with pagination
- ✅ Email details (subject, body, date)
- ✅ AI categorization tags
- ✅ Account and folder information

### **3. Responsive Design**
- ✅ Mobile-friendly interface
- ✅ Category color coding
- ✅ Loading states
- ✅ Error handling

## 🔍 **Backend API Endpoints to Test**

### **1. Health Check**
```bash
curl http://localhost:3000/health
```
**Expected:** `{"status":"ok","timestamp":"..."}`

### **2. Get Accounts**
```bash
curl http://localhost:3000/api/accounts
```
**Expected:** `{"accounts":["rangasaimangalagiri@gmail.com"]}`

### **3. Get Emails**
```bash
curl "http://localhost:3000/api/emails?page=1&pageSize=5"
```
**Expected:** Email list with pagination

### **4. Search Emails**
```bash
curl "http://localhost:3000/api/emails/search?q=test&page=1&pageSize=5"
```
**Expected:** Filtered email results

## 🎨 **Frontend UI Components**

### **Header Section**
- ✅ "ReachInbox Onebox" title
- ✅ "AI-Powered Email Management" subtitle

### **Search & Filters**
- ✅ Search input field
- ✅ Account dropdown
- ✅ Folder dropdown
- ✅ Clear filters button

### **Email List**
- ✅ Email cards with metadata
- ✅ Category tags with colors
- ✅ Pagination controls
- ✅ Loading spinner
- ✅ Empty state

### **Category Colors**
- 🟢 **Interested**: Green
- 🔵 **Meeting Booked**: Blue
- 🔴 **Not Interested**: Red
- 🟡 **Spam**: Yellow
- ⚪ **Out of Office**: Gray
- ⚫ **Uncategorized**: Black

## 🔗 **Integration Points**

### **1. CORS Configuration**
- ✅ Frontend can call backend APIs
- ✅ Proper headers set
- ✅ No CORS errors in browser console

### **2. API Communication**
- ✅ Frontend fetches accounts from backend
- ✅ Email search works end-to-end
- ✅ Pagination syncs between frontend/backend
- ✅ Error handling works properly

### **3. Real-time Updates**
- ✅ New emails appear in frontend
- ✅ AI categorization updates display
- ✅ Webhook notifications trigger

## 🐛 **Troubleshooting**

### **Common Issues**

#### **Frontend Not Loading**
```bash
# Check if frontend is running
curl http://localhost:5173

# Restart frontend
cd frontend
npm run dev
```

#### **Backend API Errors**
```bash
# Check backend health
curl http://localhost:3000/health

# Check backend logs
cd backend
npm run dev
```

#### **CORS Errors**
- ✅ Backend has CORS enabled
- ✅ Frontend calls correct API URL
- ✅ No mixed content issues

#### **No Emails Showing**
- ✅ Backend is connected to Elasticsearch
- ✅ IMAP sync is working
- ✅ Emails are being indexed
- ✅ API endpoints return data

## 📊 **Expected Test Results**

### **Backend Tests**
- ✅ Health endpoint: 200 OK
- ✅ Accounts API: Returns account list
- ✅ Emails API: Returns paginated emails
- ✅ Search API: Returns filtered results
- ✅ CORS: Headers present

### **Frontend Tests**
- ✅ Page loads: 200 OK
- ✅ React app renders
- ✅ API calls work
- ✅ Search functionality
- ✅ Pagination works

### **Integration Tests**
- ✅ Frontend ↔ Backend communication
- ✅ Real-time email updates
- ✅ AI categorization display
- ✅ Webhook notifications

## 🎉 **Success Criteria**

Your full-stack application is working correctly when:

1. ✅ **Both servers start without errors**
2. ✅ **Frontend loads and displays emails**
3. ✅ **Search and filtering work**
4. ✅ **AI categorization is visible**
5. ✅ **Pagination functions properly**
6. ✅ **No console errors**
7. ✅ **Real-time email processing works**

## 🚀 **Next Steps**

Once testing is complete:

1. **Deploy Backend** to production
2. **Deploy Frontend** to hosting service
3. **Configure Production URLs**
4. **Set up Monitoring**
5. **Add Authentication** (if needed)

## 📝 **Test Checklist**

- [ ] Backend starts successfully
- [ ] Frontend starts successfully
- [ ] Health endpoint responds
- [ ] Accounts API works
- [ ] Emails API works
- [ ] Search API works
- [ ] CORS configured correctly
- [ ] Frontend displays emails
- [ ] Search functionality works
- [ ] Pagination works
- [ ] Category tags display
- [ ] No console errors
- [ ] Real-time updates work

**🎯 Your InboxSync application is ready for production!**

