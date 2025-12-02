# Functional Test Cases for Job Matching System

## Overview
This document contains 5 comprehensive functional test cases to validate the core job matching functionality of the Matcha application. Each test case documents input, expected output, and provides space for actual results.

---

## Test Case TC-001: Profile Matching and Job Retrieval

### Test Case ID
TC-001

### Test Name
Profile Matching and Job Retrieval

### Objective
Validate that user profiles correctly match with jobs from JSearch API and that all required job data is retrieved and structured correctly.

### Prerequisites
- Application server is running
- JSearch API key is configured (RAPIDAPI_KEY environment variable)
- Database connection is available
- User profile can be created/retrieved

### Test Data
**User Profile Input**:
```json
{
  "email": "test.user@example.com",
  "skills": ["React", "TypeScript", "Node.js", "JavaScript", "HTML", "CSS"],
  "desiredRoles": ["Frontend Developer", "Software Engineer"],
  "remotePreference": "remote",
  "yearsOfExperience": 3,
  "seniorityLevel": "mid",
  "industries": ["Technology"],
  "companySize": "medium",
  "education": "Bachelor's in Computer Science"
}
```

### Test Steps
1. **Create User Profile**
   - Navigate to `/profile` page
   - Fill in profile form with test data above
   - Submit profile creation
   - Verify profile is saved successfully

2. **Retrieve Job Matches**
   - Call `/api/matches` endpoint via POST request
   - Request body: `{ "email": "test.user@example.com" }`
   - Record response time

3. **Verify Response Structure**
   - Check response status code is 200
   - Verify response contains `matches` array
   - Verify response contains `isApproximate` boolean
   - Verify each match contains required fields

4. **Verify Job Data Completeness**
   - Check each job has: `id`, `title`, `company`, `description`, `location`, `requiredSkills`
   - Verify `applyLink` field exists in job objects
   - Verify `remotePreference` is set correctly
   - Verify `salaryRange` is present (if available)

5. **Verify Matching Quality**
   - Check that jobs match user's desired roles
   - Verify jobs are relevant to user's skills
   - Check that remote preference is respected (if filter is applied)

### Expected Results
- ✅ API returns HTTP 200 status
- ✅ Response time is less than 5 seconds
- ✅ Response contains `matches` array with at least 1 job
- ✅ Each job object contains all required fields:
  - `id` (string)
  - `title` (string)
  - `company` (string)
  - `description` (string)
  - `location` (string or undefined)
  - `requiredSkills` (array)
  - `applyLink` (string or undefined)
  - `remotePreference` (string)
  - `salaryRange` (string or undefined)
- ✅ Jobs match user's desired roles (Frontend Developer or Software Engineer)
- ✅ Jobs include apply links from JSearch API
- ✅ Response includes `isApproximate` field

### Actual Results
_To be filled during test execution_

**Status**: ⏳ Pending

**Notes**: 
- 

---

## Test Case TC-002: Apply Link Functionality

### Test Case ID
TC-002

### Test Name
Apply Link Functionality

### Objective
Validate that apply links are correctly displayed, functional, and open in new tabs with proper security attributes.

### Prerequisites
- Job matches are available with `applyLink` field populated
- Browser environment for testing link behavior
- JobMatchCard component is rendered

### Test Data
**Job Match with Apply Link**:
```json
{
  "job": {
    "id": "test-job-123",
    "title": "Frontend Developer",
    "company": "Tech Corp",
    "description": "Job description...",
    "applyLink": "https://example.com/apply/job-123",
    "requiredSkills": ["React", "TypeScript"]
  },
  "score": 85,
  "explanation": "This job matches your React and TypeScript skills...",
  "matchedSkills": ["React", "TypeScript"]
}
```

**Job Match without Apply Link**:
```json
{
  "job": {
    "id": "test-job-456",
    "title": "Backend Developer",
    "company": "Startup Inc",
    "description": "Job description...",
    "applyLink": undefined,
    "requiredSkills": ["Node.js", "Python"]
  },
  "score": 75,
  "explanation": "This job matches your backend skills...",
  "matchedSkills": ["Node.js"]
}
```

### Test Steps
1. **Render JobMatchCard with Apply Link**
   - Render JobMatchCard component with job containing `applyLink`
   - Inspect rendered HTML/DOM

2. **Verify Button Visibility**
   - Check that "Apply Now" button is visible
   - Verify button text is "Apply Now"
   - Verify button has external link icon

3. **Verify Button Styling**
   - Check button uses matcha-primary background color
   - Verify button has hover effects
   - Check button is full-width on mobile, auto-width on desktop
   - Verify button is positioned at bottom of card

4. **Verify Link Attributes**
   - Inspect anchor tag attributes
   - Verify `href` attribute contains apply link URL
   - Verify `target="_blank"` is present
   - Verify `rel="noopener noreferrer"` is present

5. **Test Link Functionality**
   - Click "Apply Now" button
   - Verify new tab/window opens
   - Verify correct URL is loaded in new tab
   - Close new tab and return to application

6. **Test Job Without Apply Link**
   - Render JobMatchCard with job missing `applyLink`
   - Verify "Apply Now" button does NOT render
   - Verify no apply-related elements are present

### Expected Results
- ✅ "Apply Now" button is visible when `job.applyLink` exists
- ✅ Button displays "Apply Now" text with external link icon
- ✅ Button styling matches design system (matcha-primary colors, hover effects)
- ✅ Link has `target="_blank"` attribute
- ✅ Link has `rel="noopener noreferrer"` attribute
- ✅ Clicking button opens new tab with correct URL
- ✅ Button does NOT render when `job.applyLink` is undefined/null
- ✅ No console errors or warnings

### Actual Results
_To be filled during test execution_

**Status**: ⏳ Pending

**Notes**: 
- 

---

## Test Case TC-003: Match Score and Explanation Generation

### Test Case ID
TC-003

### Test Name
Match Score and Explanation Generation

### Objective
Validate that match scores are calculated correctly, explanations reference user skills, and matched skills are properly highlighted.

### Prerequisites
- User profile exists with known skills
- Job listings are available from JSearch API
- Matching orchestrator is functioning
- AI services are available (or fallback is working)

### Test Data
**User Profile**:
```json
{
  "email": "test.match@example.com",
  "skills": ["React", "TypeScript", "Node.js", "Python", "Docker"],
  "desiredRoles": ["Full Stack Developer"],
  "yearsOfExperience": 4,
  "seniorityLevel": "mid",
  "remotePreference": "remote",
  "industries": ["Technology"],
  "companySize": "medium"
}
```

**Expected Job Match**:
- Job requiring React, TypeScript, Node.js
- Should have high match score (>70)
- Explanation should mention React, TypeScript, or Node.js

### Test Steps
1. **Create Profile with Known Skills**
   - Create user profile with test data above
   - Verify profile is saved

2. **Retrieve Matches**
   - Call `/api/matches` with user email
   - Capture response with matches

3. **Verify Match Scores**
   - Check that each match has a `score` field
   - Verify scores are numbers between 0-100
   - Verify scores are sorted (highest first)
   - Check that top matches have scores > 50

4. **Verify Explanations**
   - Read explanation text for each match
   - Verify explanations reference at least one user skill
   - Verify explanations use non-technical language
   - Check that explanations mention why job fits user

5. **Verify Matched Skills Display**
   - Check that `matchedSkills` array exists in each match
   - Verify matched skills are displayed as badges/tags
   - Verify matched skills are highlighted (matcha-accent color)
   - Check that matched skills appear in "Your Matching Skills" section

6. **Verify Score Breakdown**
   - Check that `features` object exists in each match
   - Verify `features.scoreBreakdown` contains skill, role, industry, etc. scores
   - Verify breakdown components sum to total score (approximately)

### Expected Results
- ✅ All matches include `score` field (number, 0-100)
- ✅ Scores are sorted in descending order
- ✅ Top matches have scores > 50
- ✅ Each explanation references at least one user skill from profile
- ✅ Explanations use non-technical, understandable language
- ✅ Explanations explain why job fits user (mentions skills, experience, or preferences)
- ✅ `matchedSkills` array contains skills that match between profile and job
- ✅ Matched skills are displayed as highlighted badges
- ✅ `features.scoreBreakdown` exists and contains component scores
- ✅ Score breakdown components are reasonable (0-100 range)

### Actual Results
_To be filled during test execution_

**Status**: ⏳ Pending

**Notes**: 
- 

---

## Test Case TC-004: Company Insight Cards

### Test Case ID
TC-004

### Test Name
Company Insight Cards

### Objective
Validate that company insight cards are generated, displayed correctly, and cached appropriately.

### Prerequisites
- Job matches are available
- AI service for company insights is available (or fallback)
- Company insights cache is functioning

### Test Data
**Job Match with Company Information**:
```json
{
  "job": {
    "id": "insight-test-123",
    "title": "Senior Software Engineer",
    "company": "Tech Innovations Inc",
    "description": "We are looking for a senior engineer...",
    "requiredSkills": ["React", "AWS", "Docker"]
  },
  "score": 80
}
```

### Test Steps
1. **Retrieve Job Matches**
   - Call `/api/matches` with user email
   - Capture matches response

2. **Verify Insight Cards Render**
   - Check that `insightCard` field exists in match results
   - Verify insight cards are displayed in JobMatchCard components
   - Check that CompanyInsightCard component renders

3. **Verify Card Content Completeness**
   - Check that insight card contains `companySize` field
   - Verify `industries` array exists and contains values
   - Check that `description` field exists and is not empty
   - Verify `keyResponsibilities` array exists with 2-3 items

4. **Verify Card Display**
   - Check card styling and layout
   - Verify company size is displayed
   - Verify industries are listed
   - Verify description text is readable
   - Verify key responsibilities are displayed as list items

5. **Test Caching Behavior**
   - Make first request to `/api/matches`
   - Record response time and note if insights are generated
   - Make second identical request within cache TTL (7 days)
   - Verify response time is faster (cached)
   - Verify insight content is identical

6. **Test Jobs Without Insights**
   - Verify that jobs without insight cards still render correctly
   - Check that missing insights don't break the UI

### Expected Results
- ✅ Insight cards appear for matched jobs (when available)
- ✅ Each insight card contains:
  - `companySize` (string: "small", "medium", "large", "enterprise")
  - `industries` (array of strings)
  - `description` (string, non-empty)
  - `keyResponsibilities` (array with 2-3 items)
- ✅ Insight cards are displayed in CompanyInsightCard component
- ✅ Card content is readable and well-formatted
- ✅ Subsequent requests use cached insights (faster response)
- ✅ Jobs without insights render without errors
- ✅ Cache TTL is respected (7 days)

### Actual Results
_To be filled during test execution_

**Status**: ⏳ Pending

**Notes**: 
- 

---

## Test Case TC-005: End-to-End User Flow

### Test Case ID
TC-005

### Test Name
End-to-End User Flow

### Objective
Validate the complete user journey from profile creation through viewing job matches to applying for jobs.

### Prerequisites
- Application is running and accessible
- Database is available
- JSearch API is configured
- AI services are available (or fallbacks work)
- Browser environment for UI testing

### Test Data
**New User Profile**:
```json
{
  "email": "e2e.test@example.com",
  "skills": ["JavaScript", "React", "TypeScript", "Node.js", "MongoDB"],
  "desiredRoles": ["Frontend Developer", "Full Stack Developer"],
  "remotePreference": "remote",
  "yearsOfExperience": 2,
  "seniorityLevel": "junior",
  "industries": ["Technology", "Software"],
  "companySize": "medium",
  "education": "Bachelor's in Computer Science"
}
```

### Test Steps
1. **Create User Profile**
   - Navigate to `/profile` page
   - Fill in Step 1: Basic Info (name, email)
   - Fill in Step 2: Skills (add test skills)
   - Fill in Step 3: Experience (years, level)
   - Fill in Step 4: Preferences (roles, remote, industries, company size)
   - Review Step 5: Review all information
   - Submit profile
   - Verify success message/confirmation

2. **Navigate to Matches Page**
   - Click link/button to view matches
   - Or navigate directly to `/matches?email=e2e.test@example.com`
   - Verify page loads without errors

3. **Verify Matches Load**
   - Check loading indicator appears initially
   - Verify matches load within 5 seconds
   - Verify matches list displays
   - Check that match count is shown in header

4. **Verify Match Components Display**
   - Check that job cards render for each match
   - Verify match scores are displayed
   - Verify explanations appear in "Why This Job Fits You" section
   - Verify matched skills are highlighted
   - Verify company insight cards appear (if available)
   - Verify job descriptions are displayed

5. **Test Apply Link Functionality**
   - Locate "Apply Now" button on a job card
   - Click "Apply Now" button
   - Verify new tab opens with job application page
   - Return to matches page
   - Verify page state is maintained

6. **Test Page Responsiveness**
   - Resize browser window to mobile size
   - Verify layout adapts correctly
   - Verify buttons and links are accessible
   - Verify text is readable

7. **Test Performance**
   - Measure page load time
   - Measure time to display matches
   - Verify no performance warnings in console
   - Check that caching is working (subsequent visits are faster)

8. **Test Error Handling**
   - Try accessing matches with invalid email
   - Verify appropriate error message displays
   - Try accessing matches without profile
   - Verify redirect to profile page or error message

### Expected Results
- ✅ Profile creation completes successfully
- ✅ User can navigate to matches page
- ✅ Matches page loads without errors
- ✅ Matches are retrieved and displayed within 5 seconds
- ✅ Match count is shown in header (e.g., "Your Job Matches (10)")
- ✅ Each match displays:
  - Job title and company name
  - Match score
  - Explanation text
  - Matched skills (highlighted)
  - Company insight card (if available)
  - Job description
  - "Apply Now" button (if applyLink exists)
- ✅ "Apply Now" button opens job application in new tab
- ✅ Page is responsive on mobile and desktop
- ✅ Page load time is acceptable (< 3 seconds)
- ✅ Matches load within 5 seconds
- ✅ Error messages are clear and helpful
- ✅ User can complete full flow without errors

### Actual Results
_To be filled during test execution_

**Status**: ⏳ Pending

**Notes**: 
- 

---

## Test Execution Summary

### Test Environment
- **Application Version**: 
- **Browser**: 
- **Operating System**: 
- **Date**: 
- **Tester**: 

### Overall Results
| Test Case ID | Test Name | Status | Notes |
|--------------|-----------|--------|-------|
| TC-001 | Profile Matching and Job Retrieval | ⏳ Pending | |
| TC-002 | Apply Link Functionality | ⏳ Pending | |
| TC-003 | Match Score and Explanation Generation | ⏳ Pending | |
| TC-004 | Company Insight Cards | ⏳ Pending | |
| TC-005 | End-to-End User Flow | ⏳ Pending | |

### Summary Statistics
- **Total Test Cases**: 5
- **Passed**: 0
- **Failed**: 0
- **Blocked**: 0
- **Pending**: 5
- **Pass Rate**: N/A

### Known Issues
_List any known issues or blockers discovered during testing_

### Recommendations
_List any recommendations for improvements or follow-up testing_

