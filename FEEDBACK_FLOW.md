# Feedback Collection Flow - User Guide

## Complete User Journey: From Booking to Feedback Submission

### 📋 **Step 1: User Makes a Booking**

1. User visits the booking page (`/booking`)
2. Selects court type (Padel, Cricket, Pickleball, or Futsal)
3. Chooses date and time slots
4. Fills out booking form with:
   - **Name** (required)
   - **Email** (required)
   - **Phone Number** (required) ⚠️
5. Submits the booking

### ✅ **Step 2: Booking Confirmation Screen**

After successful booking, user sees:

1. **Success Message**: "Booking Confirmed!"
2. **Booking Details Card** showing:
   - Booking ID
   - Court name
   - Date and time
   - Duration
   - Total price

3. **Two QR Codes** displayed:
   
   **a) Entry Verification QR Code**
   - Links to: `/booking/verify/{bookingId}`
   - Purpose: For staff to scan at entry
   - User should screenshot this for entry
   
   **b) Feedback QR Code** ⭐
   - Links to: `/feedback/{bookingId}`
   - Purpose: For user to submit feedback after their session
   - User should screenshot this for later use

4. **Instruction Message**: 
   > "📸 Please take screenshots of both QR codes. Use the first for entry verification and the second to share your feedback after your booking."

5. **"Done" Button** - Closes the modal

---

### 🎯 **Step 3: User Attends Their Booking**

- User arrives at the sports arena
- Shows Entry Verification QR code to staff
- Staff scans QR code to verify booking
- User enjoys their court session

---

### 📝 **Step 4: User Submits Feedback (After Session)**

**Option A: Using QR Code (Recommended)**

1. User opens the screenshot of the **Feedback QR Code** from Step 2
2. Scans the QR code with their phone camera
   - OR manually types the URL: `/feedback/{bookingId}`
3. Phone automatically opens the feedback form page

**Option B: Direct Link**

1. User receives feedback link via:
   - Email (if implemented)
   - SMS (if implemented)
   - Admin shares link directly
2. Clicks the link to open feedback form

---

### 🌟 **Step 5: Feedback Form Page**

When user visits `/feedback/{bookingId}`, the system:

1. **Checks if feedback already exists**:
   - ✅ If feedback exists → Shows "Thank You" success page
   - ❌ If no feedback → Shows feedback form

2. **Loads booking information**:
   - Automatically pre-fills:
     - User Name
     - Email Address
     - Phone Number
   - (User can edit if needed)

3. **User sees feedback form** with:

   **a) Star Rating Section** (Required ⚠️)
   - 5 clickable stars
   - Hover effect shows which rating will be selected
   - User clicks 1-5 stars to rate their experience
   - Shows text feedback:
     - 5 stars = "Excellent!"
     - 4 stars = "Great!"
     - 3 stars = "Good"
     - 2 stars = "Fair"
     - 1 star = "Poor"

   **b) User Information Fields** (All Required ⚠️)
   - Name (pre-filled, editable)
   - Email (pre-filled, editable)
   - Phone Number (pre-filled, editable)

   **c) Comment Section** (Optional)
   - Large text area
   - Max 1000 characters
   - Character counter shows: "X/1000 characters"
   - Placeholder: "Tell us about your experience..."

4. **Submit Button**:
   - Shows "Submit Feedback" when ready
   - Shows spinner + "Submitting..." when processing
   - Disabled during submission

---

### ✨ **Step 6: Feedback Submission Process**

When user clicks "Submit Feedback":

1. **Client-side Validation**:
   - ✅ Rating must be selected (1-5 stars)
   - ✅ All required fields must be filled
   - Shows error message if validation fails

2. **Server-side Processing**:
   - Validates booking exists
   - Checks if feedback already submitted (prevents duplicates)
   - Extracts court type from booking
   - Creates feedback record in database
   - Links feedback to booking ID

3. **Success Response**:
   - Form disappears
   - Success page appears

---

### 🎉 **Step 7: Success Confirmation Page**

After successful submission, user sees:

1. **Success Animation**:
   - Green checkmark circle with animation
   - "Thank You!" heading

2. **Confirmation Message**:
   > "Your feedback has been submitted successfully."

3. **Display Submitted Feedback**:
   - Star rating display (shows selected stars)
   - Comment (if provided) in a styled box

4. **"Return to Home" Button**:
   - Takes user back to homepage

---

### 🔒 **Step 8: Duplicate Prevention**

**If user tries to submit feedback again:**

1. System checks database for existing feedback
2. If feedback exists:
   - Shows success page immediately
   - Displays previously submitted feedback
   - Prevents duplicate submissions
   - Error message: "Feedback already submitted for this booking"

---

### 👨‍💼 **Step 9: Admin View (Behind the Scenes)**

Admins can view all feedback:

1. **Access**: Login to `/admin`
2. **Navigate**: Click "Feedback" tab
3. **View Feedback Table** showing:
   - User name and email
   - Booking ID
   - Star rating (visual stars + number)
   - Comment text
   - Court type
   - Submission date and time

4. **Features**:
   - All feedback sorted by newest first
   - Skeleton loaders while loading
   - Empty state if no feedback yet

---

## 📱 **User Experience Highlights**

### ✅ **What Makes It Easy:**

1. **Pre-filled Information**: No need to re-enter booking details
2. **Visual Rating**: Intuitive star system
3. **QR Code Access**: Quick access via screenshot
4. **Mobile-Friendly**: Works perfectly on phones
5. **Clear Instructions**: Step-by-step guidance
6. **Instant Feedback**: Immediate success confirmation
7. **No Duplicates**: System prevents multiple submissions

### 🎯 **Best Practices for Users:**

1. **Screenshot Both QR Codes**: 
   - Entry QR for staff
   - Feedback QR for later

2. **Submit Feedback Promptly**: 
   - While experience is fresh
   - After completing the session

3. **Be Honest**: 
   - Helps improve service
   - Benefits future customers

4. **Add Comments**: 
   - Specific feedback is more valuable
   - Helps identify areas for improvement

---

## 🔄 **Complete Flow Diagram**

```
User Books Court
    ↓
Receives 2 QR Codes
    ↓
Attends Session (Uses Entry QR)
    ↓
After Session
    ↓
Scans Feedback QR Code
    ↓
Opens Feedback Form
    ↓
Form Pre-filled with Booking Info
    ↓
User Selects Rating (1-5 stars)
    ↓
User Adds Comment (Optional)
    ↓
Clicks "Submit Feedback"
    ↓
System Validates & Saves
    ↓
Success Page Shown
    ↓
Feedback Appears in Admin Panel
```

---

## 🛡️ **Security & Validation**

1. **Booking Verification**: 
   - System verifies booking exists before allowing feedback
   - Invalid booking IDs are rejected

2. **Duplicate Prevention**: 
   - One feedback per booking
   - Database constraint prevents duplicates

3. **Data Validation**: 
   - Rating must be 1-5
   - Required fields enforced
   - Email format validation
   - Phone number validation

4. **Error Handling**: 
   - Clear error messages
   - Graceful failure handling
   - User-friendly error display

---

## 📊 **Data Stored**

Each feedback submission stores:

- ✅ Booking ID (links to original booking)
- ✅ User Name
- ✅ User Email
- ✅ User Phone
- ✅ Rating (1-5 stars)
- ✅ Comment (optional, max 1000 chars)
- ✅ Court Type (auto-extracted from booking)
- ✅ Submission Timestamp
- ✅ Last Updated Timestamp

---

## 🎨 **Visual Flow Summary**

**Booking Confirmation** → **Two QR Codes** → **User Screenshots** → **After Session** → **Scan Feedback QR** → **Form Opens** → **Rate & Comment** → **Submit** → **Success!** → **Admin Views**

---

This feedback system provides a seamless, user-friendly way to collect valuable customer insights while maintaining data integrity and preventing duplicate submissions.
