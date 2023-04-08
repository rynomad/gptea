// Create a string with `alert('42')`
const alertString = "alert('42');";

// Create a Blob and Object URL of the alert string
const alertBlob = new Blob([alertString], { type: "text/javascript" });
const alertObjectURL = URL.createObjectURL(alertBlob);

// Create a minimal HTML string with a script tag that has its `src` attribute set to the alert Object URL
const htmlString = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Esoteric Page</title>
</head>
<body>
  <script src="${alertObjectURL}"></script>
</body>
</html>
`;

// Create an Object URL of the HTML string
const htmlBlob = new Blob([htmlString], { type: "text/html" });
const htmlObjectURL = URL.createObjectURL(htmlBlob);

// Create an iframe with the `src` attribute set to the HTML Object URL
const iframe = document.createElement("iframe");
iframe.src = htmlObjectURL;

// Attach the iframe to the body of the page
document.body.appendChild(iframe);
