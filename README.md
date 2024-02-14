1) Calculates the net salary from the gross salary in a .json file.
2) Navigates to the bank website to calculate the maximum loan amount, adds 15% on top to get the price limit.
3) Retrieves real estate data based on the price limit.
4) The data is saved via SQLite. It can be imported to BI tools using an ODBC driver.

To use the project, first install NodeJS.

Create a PrivateData.json in the same folder as the other files. The content has to be as follows:

{

    "GrossSalary": 0000,
    
    "APIKey": "xxxxxxxxxxxxxxxxxxxxxxxx",
    
    "WorkAddress": "Street Number, City"
    
}

Afterwards open a terminal in your IDE and run "npm install axios puppeteer sqlite3 typescript ts-node" to install the necessary packages.

Starting the program is done with the command "ts-node start.ts".
