# ai-scout-entireCanberraTimes

Demo of newspaper searching - all 3.1m Canberra Times articles, 1926-94

This repo contains code that has been copied from a succession of exploratory demos, so there is dead code inherited from those demos. When I come across it, I'll delete it.

The Java programs loaded data into a SOLR index, the web server runs a simple demo search.

Unlike an earlier newspaper demo, we dont have named entities (TODO)

## Java programs

TODO - describe GTE and nomic embeddings
### LoadBgeBase768ToSolr
Original load program used in earlier demos that also loaded entities (which we dont load) - just included for "background" info

### AddGteBase768EmbeddingsToArticles

Use the now dropped GTE ( Alibaba-NLP/gte-base-en-v1.5 ) embedding - although it supports a long (8192) token context, the results were so-so.

## AddNomic768EmbeddingsToArticles

Same as AddGteBase768EmbeddingsToArticles, except backend embedding server used nomic ( nomic-ai/nomic-embed-text-v1.5 ) - so, no point in being a new program, right?  The embedding used COULD just have been a runtime parameter to a mythical AddEmbeddingsToArticles program... TODO

## LoadGteBase768ToSolr

Loads the output of the AddXXXEmbeddingsToArticles program to SOLR (see SOLR schema section below)



## Web server

Typical node server.  Uses https, create a self signed cert like this:

```
(base) kfitch@hinton:~/entireCanberraTimes/web$ openssl genrsa -out key.pem
(base) kfitch@hinton:~/pictures/web$ openssl req -new -key key.pem -out csr.pem
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [AU]:
State or Province Name (full name) [Some-State]:ACT
Locality Name (eg, city) []:Canberra
Organization Name (eg, company) [Internet Widgits Pty Ltd]:NLA
Organizational Unit Name (eg, section) []:Digital
Common Name (e.g. server FQDN or YOUR name) []:hinton.nla.gov.au
Email Address []:kfitch@nla.gov.au

Please enter the following 'extra' attributes
to be sent with your certificate request
A challenge password []:
An optional company name []:
(base) kfitch@hinton:~/entireCanberraTimes/web$ openssl x509 -req -days 360 -in csr.pem -signkey key.pem -out cert.pem
Certificate request self-signature ok
subject=C = AU, ST = ACT, L = Canberra, O = NLA, OU = Digital, CN = hinton.nla.gov.au, emailAddress = kfitch@nla.gov.au
(base) kfitch@hinton:~/entireCanberraTimes/web$
```

This creates these files:

key.pem csr.pem cert.pem

The .env file defines the TCP port the node server will listen on, and how it can find SOLR, an embedding service and a generative LLM.  

The node app was copied from an earlier newspapers demo.  The js packages I think are used are a typical set:

```
npm install express
npm install helmet
npm install body-parser
npm install axios
npm install dotenv
npm install cookie-parser
npm install http-errors
npm install log4js
npm install morgan
npm install rotating-file-stream
npm install ejs
npm install moment
npm install solr-client
```

run webserver like this

`node app.js`

One of the interesting things tried in this demo was a fancy filtered search using edismax in routes/search.js:

```
  let fancyQ = "&q={!bool filter=$retrievalStage must=$rankingStage}" +
  "&retrievalStage={!bool should=$lexicalQuery should=$vectorQuery}" +
  "&rankingStage={!func}sum(query($normalisedLexicalQuery),query($normalisedVectorQuery))" +
  "&normalisedLexicalQuery={!func}scale(query($lexicalQuery),0," + (1.0 - keywordScaling) + ")" +
  "&normalisedVectorQuery={!func}scale(query($vectorQuery),0," + keywordScaling + ")" +
  "&lexicalQuery={!type=edismax qf='heading^2 article^1 headingStemmed^1.5 articleStemmed^0.5' " +
    "pf='heading^4 article^1.5 headingStemmed^2.0 articleStemmed^0.8'}" + stxt +
  "&vectorQuery={!knn f=vector topK=100}" +  JSON.stringify(qVec) ;
```

Is it worth it?  How can it be improved?

## SOLR schema

See SOLRschemas/managed-schema.xml - basic newspaper article schema with a vector (embedding), unstemmed and stemmed text (for keyword/phrase search) and metadata (title, heading, article category, issue date & year).


