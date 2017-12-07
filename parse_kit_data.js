var fs = require('fs');
PDFParser = require("pdf2json");

numWorking = 0;
fullFormatedText = "";

fs.readdir('./PDF/', function(err, items) {
    items = items.filter(function(item){
        return item.indexOf('.pdf') >= 0;
    });
    numWorking = items.length;
    for(let i=0; i<items.length; i++)
    {
        console.log('Found PDF: '+items[i]);
        loadPDF(items[i]);
    }
});


function loadPDF(filename) {
    let pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", errData => {
        console.error(errData.parserError);
        numWorking--; 
    });
    pdfParser.on("pdfParser_dataReady", pdfData => {
        parseFile(pdfData, filename);
    });
    pdfParser.loadPDF("./PDF/"+filename);
}


function parseFile(obj, filename) {

    let lines = [];
    let lastY = -1;

    let cases = [];

    for(let p = 0; p < obj.formImage.Pages.length; p++)
    {
        let page = obj.formImage.Pages[p];
        for(let t = 0; t < page.Texts.length; t++)
        {
            let text = page.Texts[t];
            text.R[0].T = unescape(text.R[0].T);
            while(text.R[0].T.indexOf(',')>-1)
            {
                text.R[0].T = text.R[0].T.replace(',',' ');
            }

            if(text.R[0].T.indexOf('Department Case Number')>-1)
            {
                cases.push(lines);
                lines = [];
            }

            if(text.R[0].T.indexOf('Page')>-1 || text.R[0].T.indexOf('C:\\')>-1 || text.R[0].T.indexOf('.rpt')>-1)
            {
                continue;
            }

            if(text.y != lastY)
            {
                lines.push(text.R[0].T);
            }
            else {
                lines[lines.length-1] = lines[lines.length-1] + text.R[0].T;
            }
            lastY = text.y;
        }
    }
    //console.log(cases);

    let lastCaseId = -1;
    for(let i=cases.length-1; i>=0; i--)
    {
        if(!cases[i] || !cases[i][0])
        {
            continue;
        }
        if(cases[i][0] == lastCaseId)
        {
            cases.splice(i,1);
            lastCaseId = -1;
        }
        else
        {
            lastCaseId = cases[i][0];
        }
    }

    let formatedText = '';
    if(fullFormatedText == '')
    {
        formatedText = 'Department Case Number,Case Officer,Offense Date/Time,Offense Type,Collection Date,Item,Barcode,Packaging/Quantity/Item Type,Detail Description,Make/Model,Value,Caliber,Current Custody,Status Officer,Chain of Custody ID,Custody Date/Time\n';
    }
    for(let i = 1; i < cases.length; i++)
    {
        let joinedCases = cases[i].join(',');
        if(joinedCases.indexOf('Detail Description: ')<0)
        {
            joinedCases = joinedCases.replace('Make/Model',',Make/Model')
        }
        joinedCases = joinedCases.replace('Department Case Number: ','');
        joinedCases = joinedCases.replace('Case Officer: ','');
        joinedCases = joinedCases.replace(',Item Type/Status Report','');
        joinedCases = joinedCases.replace(',Spokane Police Department','');
        joinedCases = joinedCases.replace(',Item Status: 0001 - Item Collected','');
        joinedCases = joinedCases.replace('Custody Date/Time: ','');
        joinedCases = joinedCases.replace('Collection Date: ','');
        joinedCases = joinedCases.replace('Offense Date/Time: ','');
        joinedCases = joinedCases.replace('Item: ','');
        joinedCases = joinedCases.replace('Detail Description: ','');
        joinedCases = joinedCases.replace('Make/Model: ','');
        joinedCases = joinedCases.replace('Caliber: ','');
        joinedCases = joinedCases.replace('Chain of Custody History,','');
        joinedCases = joinedCases.replace('Current Custody: ','');
        joinedCases = joinedCases.replace('Status Officer: ','');
        joinedCases = joinedCases.replace('Value: ',',');
        joinedCases = joinedCases.replace('Packaging/Quantity/Item Type: Packaging/Quantity/Item Type: ','');
        joinedCases = joinedCases.replace('Offense Type: ',',');

        if(joinedCases.split(',').length==17)
        {
            joinedCases = joinedCases.split(',');
            joinedCases.pop();
            joinedCases = joinedCases.join(',');
        }

        let extraCase = '';
        if(joinedCases.split(',').length>=20)
        {
            extraCase = joinedCases.split(',').slice(16).join(',');
            joinedCases = joinedCases.split(',').slice(0,16).join(',');
        }

        if(extraCase != '')
        {
            if(extraCase.indexOf('Detail Description: ')<0)
                {
                    extraCase = extraCase.replace('Make/Model',',Make/Model')
                }
                extraCase = extraCase.replace('Department Case Number: ','');
                extraCase = extraCase.replace('Case Officer: ','');
                extraCase = extraCase.replace(',Item Type/Status Report','');
                extraCase = extraCase.replace(',Spokane Police Department','');
                extraCase = extraCase.replace(',Item Status: 0001 - Item Collected','');
                extraCase = extraCase.replace('Custody Date/Time: ','');
                extraCase = extraCase.replace('Collection Date: ','');
                extraCase = extraCase.replace('Offense Date/Time: ','');
                extraCase = extraCase.replace('Item: ','');
                extraCase = extraCase.replace('Detail Description: ','');
                extraCase = extraCase.replace('Make/Model: ','');
                extraCase = extraCase.replace('Caliber: ','');
                extraCase = extraCase.replace('Chain of Custody History,','');
                extraCase = extraCase.replace('Current Custody: ','');
                extraCase = extraCase.replace('Status Officer: ','');
                extraCase = extraCase.replace('Value: ',',');
                extraCase = extraCase.replace('Packaging/Quantity/Item Type: Packaging/Quantity/Item Type: ','');
                extraCase = extraCase.replace('Offense Type: ',',');
                extraCase = '\n' +  joinedCases.split(',').slice(0,4).join(',') + ',' + extraCase;
        }

        formatedText = formatedText + joinedCases + extraCase + '\n';
    }

    numWorking--;
    fullFormatedText = fullFormatedText + formatedText;
    console.log('Parsed: '+filename);

    if(numWorking == 0)
    {
        var fs = require('fs');
        fs.writeFile("./CSV/output.csv", fullFormatedText, function(err) {
            if(err) {
                return console.log(err);
            }
            console.log("\nCSV saved to ./CSV/output.csv\n");
        });
    }
    
}


