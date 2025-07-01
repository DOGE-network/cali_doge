# California Doge API Testing Guide

This guide provides comprehensive instructions for testing the California Doge API endpoints using Postman collections.

## 📁 Files Included

- `cali-doge-api-testing.postman_collection.json` - Main API testing collection
- `cali-doge-api-testing.postman_environment.json` - Environment variables for testing
- `POSTMAN_TESTING_GUIDE.md` - This guide

## 🚀 Quick Start

### 1. Import the Collection and Environment

1. Open Postman
2. Click **Import** button
3. Import both files:
   - `cali-doge-api-testing.postman_collection.json`
   - `cali-doge-api-testing.postman_environment.json`

### 2. Set Up Environment

1. In Postman, select the **"California Doge API Testing Environment"** from the environment dropdown
2. Verify the `baseUrl` is set to `http://localhost:3000` (or your development server URL)

### 3. Start Your Development Server

```bash
npm run dev
# or
yarn dev
```

## 📋 API Endpoints Overview

The collection includes tests for the following API endpoints:

### 🔍 Search API (`/api/search`)
- **Search All Types**: Search across departments, vendors, programs, and funds
- **Search Departments Only**: Filter search results to departments only
- **Search Vendors Only**: Filter search results to vendors only

### 💰 Spending Data API (`/api/spend`)
- **Vendor View**: Get vendor spending transactions
- **Budget View**: Get budget allocation data
- **Compare View**: Compare vendor spending vs budget allocations
- **Filtering**: By department, vendor, program, fund, year
- **Sorting**: By amount, year, department, vendor, program, fund
- **Pagination**: Support for large datasets

### 🏛️ Departments API (`/api/departments`)
- **Get All Departments**: Retrieve all available departments
- **Get Available Slugs**: Get department slugs with detailed pages

### 🏢 Vendors API (`/api/vendors/top`)
- **Top Vendors by Year**: Get top spending vendors for specific year
- **Top Vendors All Years**: Get top vendors across all years
- **Search Top Vendors**: Search within top vendors

### 📊 Programs API (`/api/programs`)
- **Get All Programs**: Retrieve all available programs
- **Programs by Department**: Get programs for specific department/year
- **Program Details**: Get detailed information for specific program

### 📁 Media API (`/api/media`)
- **Get Media Files**: Access images, documents, and other media

### 📧 Email API (`/api/send-email`)
- **Send Email**: Test email functionality

## 🔗 API Chaining Tests

The collection includes a special **"API Chaining Tests"** folder that demonstrates how to chain API calls together:

### Chaining Workflow:
1. **Search for Department** → Find a department to work with
2. **Get Department Spending** → Get spending data for that department
3. **Search for Vendor** → Find vendors from the spending data
4. **Get Vendor Spending Details** → Get detailed vendor information
5. **Get Program Details** → Get program information from spending data

### How API Chaining Works:

API chaining allows you to:
- Use data from one request as input for subsequent requests
- Test complex workflows that mirror real user interactions
- Validate interconnected API functionality
- Store response data in environment variables for reuse

## ⚡ Performance Tests

The collection includes performance testing scenarios:

### Large Dataset Test
- Tests API performance with 100+ records
- Validates response time stays under 5 seconds
- Checks pagination works correctly

### Complex Filter Test
- Tests multiple filters applied simultaneously
- Validates sorting and filtering performance
- Ensures response time stays under 3 seconds

## 🛡️ Error Handling Tests

Comprehensive error handling tests ensure your API gracefully handles:

- **Invalid Parameters**: Invalid year, negative limits, etc.
- **Non-existent Data**: Requests for departments/vendors that don't exist
- **Edge Cases**: Boundary conditions and unexpected inputs

## 🧪 Running Tests

### Individual Tests
1. Select any request in the collection
2. Click **Send** to execute
3. Check the **Test Results** tab for validation results

### Collection Runner
1. Click the collection name
2. Click **Run collection**
3. Select which tests to run
4. Click **Run California Doge API Testing**

### Newman (Command Line)
```bash
# Install Newman
npm install -g newman

# Run the collection
newman run cali-doge-api-testing.postman_collection.json -e cali-doge-api-testing.postman_environment.json

# Run with HTML report
newman run cali-doge-api-testing.postman_collection.json -e cali-doge-api-testing.postman_environment.json -r html
```

## 🔧 Customization

### Adding New Tests
1. Duplicate an existing request
2. Modify the URL, parameters, or body
3. Add custom test scripts in the **Tests** tab
4. Update the request name and description

### Environment Variables
Add new variables to the environment file:
```json
{
  "key": "newVariable",
  "value": "defaultValue",
  "type": "default",
  "enabled": true
}
```

## 📊 Expected Response Formats

### Search API Response
```json
{
  "departments": [...],
  "vendors": [...],
  "programs": [...],
  "funds": [...],
  "keywords": [...],
  "totalResults": 150,
  "query": "transportation"
}
```

### Spending API Response
```json
{
  "spending": [
    {
      "year": 2024,
      "department": "Transportation",
      "vendor": "ABC Construction",
      "program": "2500-001",
      "fund": "1000",
      "amount": 1500000
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 500,
    "itemsPerPage": 50
  },
  "summary": {
    "totalAmount": 75000000,
    "recordCount": 500
  }
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure your development server is running
   - Check the `baseUrl` environment variable

2. **404 Errors**
   - Verify API routes exist in your codebase
   - Check URL paths are correct

3. **Empty Results**
   - Ensure your database has test data
   - Check if filters are too restrictive

4. **Environment Variables Not Working**
   - Verify the environment is selected
   - Check variable names match exactly

## 📈 Best Practices

1. **Test Data**: Ensure your database has realistic test data
2. **Environment Isolation**: Use separate environments for dev/staging/prod
3. **Regular Updates**: Keep the collection updated as APIs evolve
4. **Documentation**: Update test descriptions when APIs change
5. **Performance Monitoring**: Track response times over time

## 🔄 Continuous Integration

### GitHub Actions Example
```yaml
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Start server
        run: npm run dev &
      - name: Wait for server
        run: sleep 10
      - name: Run API tests
        run: |
          npm install -g newman
          newman run cali-doge-api-testing.postman_collection.json -e cali-doge-api-testing.postman_environment.json
```

## 📚 Additional Resources

- [Postman Learning Center](https://learning.postman.com/)
- [API Chaining with Postman](https://www.qatouch.com/blog/api-chaining-with-postman/)
- [Postman Flows Documentation](https://learning.postman.com/docs/postman-flows/tutorials/advanced/running-requests-in-sequence/)

## 🤝 Contributing

When adding new API endpoints or modifying existing ones:

1. Update the Postman collection
2. Add appropriate test cases
3. Update this documentation
4. Test the collection thoroughly

---

**Happy Testing! 🚀** 