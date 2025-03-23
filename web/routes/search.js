const express = require('express') ;
const router = express.Router() ;
const log = require('log4js').getLogger('home') ;
const util = require('../util/utils') ;
const axios = require('axios') ;

let appConfig = null ;
        
function init(appConfigParm) {

  appConfig = appConfigParm ;
  router.get('/initSearch',		    async (req, res) => { initSearch(req, res) }) ;
  return router ;  
}

async function getEmbedding(str) {
/*
  let eRes = await axios.post(appConfig.embeddingURL, 
    { model:"BAAI/bge-base-en-v1.5",
      input: ["Represent this sentence for searching relevant passages: " + str] // bge requires this magic prefix to make embeddings best suited for retrieval similarity !?
    },
    { headers: {'Content-Type': 'application/json'}
    }  
  ) ;
*/
  let eRes = await axios.post(appConfig.embeddingURL, 
    { model:"Alibaba-NLP/gte-base-en-v1.5",
      input: [str] // bge requires this magic prefix to make embeddings best suited for retrieval similarity !?
    },
    { headers: {'Content-Type': 'application/json'}
    }  
  ) ;

  if (!eRes.status == 200) throw "Cant get embedding, embedding server returned http resp " + eRes.status ;
  if (!eRes.data || !eRes.data.data) throw "Cant get embedding, embedding server returned no data" ;
  return eRes.data.data[0].embedding ;
}

/*****
async function getResultListSummary(docList, question) {
 
  let maxArts = docList.length ;
  if (maxArts > 8) maxArts = 8 ;
  console.log("maxArts " + maxArts) ;

  let prompt = "<|system|> You are a helpful assistant who answers a single question based " +
   "only on the context provided and suggests 3 follow-up questions that could also be " +
   "asked based on the context.  The context consists of " + maxArts + " newspaper articles, each within " +
   "their own article tag (<article>) which start with their article number and date of " +
   "issue. Clearly reference the article number " + //using the form \"Article n\", where n is the article number, " +
   "of every article you used to construct " +
   "your answer. If the answer cannot be deduced from the context, say so. " +
   "Never provide a preamble before your answer. Immediately follow your answer with your " +
   "3 suggested follow-up questions.</s> <|user|> Context: " ;


  let budgetPerArticle = Math.floor(7500 / maxArts) ;

  for (let i=0;i<maxArts;i++) {
    let art = docList[i].summary ;
    let len = art.length ;
    if (len > budgetPerArticle) art = art.substring(0, budgetPerArticle) ;
    let j = art.lastIndexOf(".") ;  // try to finish on a space
    if (j > (len - 200)) art = art.substring(0, j+1) ;
    prompt += "<article> Article " + (i+1) + ". Date of issue: " + docList[i].issue + ". " + cleanseVeryLite(art) + " </article>" ;
  }
  prompt += "That is the end of the articles. Remember to cite articles you use in your summary (as \"Article n\") when answering this question: " + cleanseVeryLite(question) +  " </s><|assistant|>" ;

  console.log("SENDING RS PROMPT SUMMARY " + prompt + " total LENGTH: " + prompt.length) ;

  var eRes = null ;
  try {
    eRes = await axios.post(appConfig.summaryURL, 
      { "prompt": prompt,              
        "temperature":0.0,
        "top_k":4,
        "n_predict":600,
        "stream":false,
        "repeat_penalty":1.1,
        "repeat_last_n":64,
        "cache_prompt":false,
        "tokens_cached":0
      },
      { headers: {'Content-Type': 'application/json'}
      }  
    ) ;
    console.log("back from get rs sum") ;
    if (!eRes.status == 200) throw "Cant get listSummary, server returned http resp " + eRes.status ;
    if (!eRes.data || !eRes.data.content) throw "Cant get listSummary, server returned no data" ;
    console.log("Summary:" + eRes.data.content) ;
    let t = eRes.data.content.replaceAll("\n", "<BR>") ;
    if (t.indexOf("Answer:") == 0) t = t.substring(7) ;
    //  console.log("ans len = " + t.length) ;
    // try hyperlink articles - dirty hack - rewrite

    let start = 0 ;
    while (start < t.length) {
      let i = t.indexOf("article ", start) ;
      let j = t.indexOf("Article ", start) ;
      if (i < 0) i = j ;
      if ((j > 0) && (j < i)) i = j ;
      if (i < 0) break ;

      let k = t.charAt(i + 8) ;
      if ((k >= '1') && (k <= '8')) {
          t = t.substring(0, i) + "<a href='https://trove.nla.gov.au/newspaper/article/" + docList[1 + Number(k)].id +
              "'>" + t.substring(i, i+10) + "</a>" + t.substring(i+10) ;
          start = i + 10 + 52 + ("" + docList[1 + Number(k)].id).length + 2 + 2 ;
      }
      else start = i + 6 ;
    }
    return {summary: "Result Summary: <P>" + t + "</P>"} ;
  }
  catch (e) {
    console.log("Error in getResultListSummary: " +e + "\neRes:" + eRes) ;
    return {summary: "Error "} ;    
  }
}
***/

async function getResultListSummaryChunked(docList, question, res) {
 
  let maxArts = docList.length ;
  if (maxArts > 8) maxArts = 8 ;

  let budgetPerArticle = Math.floor(7500 / maxArts) ;

  var prompt ;
  var startResponseMarker ;

  switch (appConfig.inferenceEngine) {
    case "llama.cpp":
      prompt = "<|system|> You are a helpful assistant who answers a single question based " +
        "only on the context provided and suggests 3 follow-up questions that could also be " +
        "asked based on the context.  The context consists of " + maxArts + " newspaper articles, each within " +
        "their own article tag (<article>) which start with their article number and date of " +
        "issue. Clearly reference the article number " + //using the form \"Article n\", where n is the article number, " +
        "of every article you used to construct " +
        "your answer. If the answer cannot be deduced from the context, say so. " +
        "Never provide a preamble before your answer. Immediately follow your answer with your " +
        "3 suggested follow-up questions.</s> <|user|> Context: " ;

      for (let i=0;i<maxArts;i++) {
        let art = docList[i].summary ;
        if (!art) art = docList[i].article ;
        let len = art.length ;
        if (len > budgetPerArticle) art = art.substring(0, budgetPerArticle) ;
        let j = art.lastIndexOf(".") ;  // try to finish on a space
        if (j > (len - 200)) art = art.substring(0, j+1) ;
        prompt += "<article> Article " + (i+1) + ". Date of issue: " + docList[i].issue + ". " + cleanseVeryLite(art) + " </article>" ;
      }
      prompt += "That is the end of the articles. Remember to cite articles you use in your summary (as \"Article n\") when answering this question: " + cleanseVeryLite(question) +  " </s><|assistant|>" ;
      break ;

    case "vllm":
    case "llama.cpp-chatML":
    case "openAI":

      /* starling?
      prompt = "The source context for a summary and 3 suggested follow-up questions consists of " + maxArts + " articles and a single question.  Each article appears within an " +
              "article tag (for example, [Article 2]) and starts with the article number and date of issue.  " +
              "The summary is confined to information from the articles " +
              "and always clearly references the article number used to construct the summary. " +
              "The summary also references a single question supplied in the context with a question tag, [Question]. " + // , [Question]
              "The summary clearly states if no articles can answer the question.  After the summary, 3 suggested follow-up " +
              "questions are generated, then the string [END SUMMARY] is generated and then no more text is generated.\n" +   // 
              "Here is the article context: " ;
      for (let i=0;i<maxArts;i++) {
            let art = docList[i].summary ;
            if (!art) art = docList[i].article ;
            let len = art.length ;
            if (len > budgetPerArticle) art = art.substring(0, budgetPerArticle) ;
            let j = art.lastIndexOf(".") ;  // try to finish on a space
            if (j > (len - 200)) art = art.substring(0, j+1) ;
            prompt += "[Article " + (i+1) + "] Article " + (i+1) + ". Date of issue: " + docList[i].issue + ". " + 
                      cleanseVeryLite(art) + " [End of Article " + (i+1) + "]\n" ;            
      }
      prompt += "\nThat is the end of the articles. The summary always explicitly references source articles, for example " +
                "\"Article 3 states...\".\nHere is the question: [Question] " +  cleanseVeryLite(question) +  "[End of Question]\n" +
                "Here is the summary and 3 follow-up questions:\n[SUMMARY]" ;

      startResponseMarker = "[SUMMARY]"                
      */
      prompt = "<|im_start|>system\n" +
              "You are a helpful assistant who answers a single question from the user based " +
              "only on the context provided and then suggests 3 follow-up questions that could also be " +
              "asked based on the context. Always mark the end of your response with \"[End]\". The context consists of " + maxArts + " newspaper articles, each within " +
              "their own article tag ([Article]) which start with their article number and date of " +
              "issue. Always clearly reference the article number " + //using the form \"Article n\", where n is the article number, " +
              "of every article you used to construct " +
              "your answer, for example \"Article 3 states...\". " +
              "If the answer cannot be deduced from the context, say so. " +
              "Never provide a preamble before your answer. Immediately follow your answer with your " +
              "3 suggested follow-up questions and then the string  \"[End]\". Here is the context: " ;

              for (let i=0;i<maxArts;i++) {
                let art = docList[i].summary ;
                //console.log(" ART i " + i + " article " + docList[i].article + "\nSUMMARY" + docList[i].summary) ;
                if (!art || !(typeof  art  == 'string')) art = docList[i].article ;
                let len = art.length ;
                if (len > budgetPerArticle) art = art.substring(0, budgetPerArticle) ;
                //console.log("ART len " + len + " budget " + budgetPerArticle + " i " + i + " art " + art) ; // JSON.stringify(art)) ;
                let j = art.lastIndexOf(".") ;  // try to finish on a space
                if (j > (len - 200)) art = art.substring(0, j+1) ;
                prompt += "[Article] Article " + (i+1) + ". Date of issue: " + docList[i].issue + ". " + cleanseVeryLite(art) + " [End of Article]" ;
              }
              prompt += "That is the end of the articles. Always cite articles you use in your summary, for example \"Article 3 states...\"." +
              "<|im_end|>\n" +
     //         "<|im_start|>user\nSummarise and cite the source articles to answer the question, then provide 3 follow-up questions.  Here is the question: " + cleanseVeryLite(question) +  "<|im_end|>\n" +
                "<|im_start|>user\nProvide the answer by summarising the articles, citing source articles, then provide 3 follow-up questions for this question: " + cleanseVeryLite(question) +  "<|im_end|>\n" + 
       //       "<|im_start|>user\nSummarise the answers, citing source articles, then provide 3 follow-up questions for this question: " + cleanseVeryLite(question) +  "<|im_end|>\n" +
              "<|im_start|>assistant\n[Summary]" ;
      startResponseMarker =  "[Summary]" ; // "<|im_start|>assistant" ;
      break ;        
  }

  console.log("SENDING RS PROMPT *STREAM* SUMMARY " + prompt + " total LENGTH: " + prompt.length) ;

  let response = null ;
  try {

    var data ;
    let vllm = false ;
    let openAI = false ;

    switch (appConfig.inferenceEngine) {
      case "llama.cpp":
      case "llama.cpp-chatML":
        data = {
          "prompt": prompt,              
          "temperature":0.0,
          "top_k":4,
          "n_predict":600,
          "stream":true,
          "repeat_penalty":1.1,
          "repeat_last_n":64,
          "cache_prompt":false,
          "tokens_cached":0
    //,"system-prompt":{"prompt": "Be helpful.", "anti_prompt": "user:", "assistant_name": "assistant:"} // test
        } ;
        break ;

      case "vllm":
        vllm = true ;
        data = {
          "prompt": prompt,
 // vllm 0.6.3         "use_beam_search": false, // just generate one response..              
          "temperature":0.0,
          "n":1,
          "max_tokens": 600,
          "stream":true,
          skip_special_tokens: false,                         // skip and stop are attempts to stop startling model from seeming to loop
          stop: ["<", "<|im_end|>", "[**End]"]  // - seems to work a bit!
    //,"system-prompt":{"prompt": "Be helpful.", "anti_prompt": "user:", "assistant_name": "assistant:"} // test
        } ;
        break ;   
        
      case "openAI":
        openAI = true ;
        data = {
          "model": appConfig.modelName,
          "prompt": prompt,
          "max_tokens": 600,
          "stream":true,
          "temperature": 0
        }
      break ;      

      default:
          throw "Unexpected inference engine: " + appConfig.inferenceEngine ;
    }

    console.log("SENDING RESULTS SUMMARY req TO " + appConfig.summaryURL) ;
    response = await fetch(appConfig.summaryURL, { 
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body:
        JSON.stringify(data)   
      }) ;

    const readableStream = response.body ;
    const reader = readableStream.getReader() ;
    let text = "" ;
    if (vllm) {
      let skip = -1 ; // first time

      while (true) {
        const { done, value } = await reader.read() ;
       console.log("\ngot getResultListSummaryChunked done:" + done) ; // + " value " + value) ;
        if (done) break;
        let latestText = new TextDecoder("utf-8").decode(value) ;
        {
          let junk = latestText ;
          if (junk && (junk.length > 100)) junk = junk.substring(0, 50) + " ... " + junk.substring(junk.length - 50) ;
          console.log("value.length was " + value.length + "\nlatestText now is: " + junk) ;
        }
        text +=  latestText ;
        console.log("text received tot len " + text.length) ;
        let splitChar = "X" ;
        if (text.endsWith("\0")) splitChar = "\0" ;
        else if (text.endsWith("\n")) splitChar = "\n" ;

        if(splitChar != "X") {
        //if (text.endsWith("\0")) {
          console.log("sending text") ; // + text) ;

          const objects = text.split(splitChar) ; // text.split("\0");
          let runningText = "" ;
          for (const obj of objects) {
            try {
                runningText += obj;
                if (runningText.length > 0) {
                    if (runningText.startsWith("{\"text\": [\"") && runningText.endsWith("\"]}")) { // expected..
                      runningText = runningText.substring(11, runningText.length - 3) ;
                      if (skip < 0) {
                        skip = runningText.indexOf(startResponseMarker) ;
                        if (skip < 0) runningText = "" ;
                        else skip = skip + startResponseMarker.length ;
                      }
                      if (skip > 0) {
                        if (runningText.length < skip) runningText = "" ;
                        else {
                          let newSkip = runningText.length ;
//if ((newSkip > 4220) && (newSkip < 4260)) {
//  console.log("skip " + skip + " newSkip " + newSkip + "rt @4220:" + runningText.substring(4220) + " FROM SKIP:" + runningText.substring(skip)) ;
//}                          
                          runningText = runningText.substring(skip) ;
                          skip = newSkip  ;
  //                        console.log("rt: " + runningText + ",skip:" + skip) ;
                        }
                        console.log("\nSKIP="+skip+ ", runningText=" + runningText) ;

                        if (runningText.length > 0) 
                          res.write(JSON.stringify({ok: true, type: "resultListSummary", results: {summary: runningText, done:false}})+ "\n") ;
                      }
                    //console.log("\n ********Received", result);
                    }
                }
                runningText = "";
            } 
            catch (e) {
              console.log("summary chunk error: " + e + " on text: " + runningText)
              res.write(JSON.stringify({ok: true, type: "resultListSummary", error: "" + e})+ "\n") ;
            }
          }
          text = "" ;       
        }
        else {
          console.log("text not ending with \\0") ;
        }
      }  
    }
    else if (openAI) {


      //return {summary: "Summary: " + ro, seq: seq} ;
/*
      data: {"id":"cmpl-f87bd9afeffc4922ac24acca6d59f334","object":"text_completion","created":1742611455,
      "model":"neuralmagic/gemma-2-9b-it-FP8",
      "choices":[{"index":0,"text":"?","logprobs":null,"finish_reason":null,"stop_reason":null}],"usage":null}

data: {"id":"cmpl-f87bd9afeffc4922ac24acca6d59f334","object":"text_completion","created":1742611455,"model":"neuralmagic/gemma-2-9b-it-FP8","choices":[{"index":0,"text":"\n\n","logprobs":null,"finish_reason":null,"stop_reason":null}],"usage":null}

data: {"id":"cmpl-f87bd9afeffc4922ac24acca6d59f334","object":"text_completion","created":1742611455,"model":"neuralmagic/gemma-2-9b-it-FP8","choices":[{"index":0,"text":"The","logprobs":null,"finish_reason":null,"stop_reason":null}],"usage":null}
*/


      while (true) {
        const { done, value } = await reader.read() ;
      //console.log("openAI got getResultListSummaryChunked done:" + done) ; // + " value " + value) ;
        if (done) {
          console.log("openAI stream done") ;
          break;
        }
        let latestText = new TextDecoder("utf-8").decode(value) ;
        //console.log("latestText now is: " + latestText) ;
        if (latestText.startsWith("data:")) {
          let p = latestText.substring(5).trim() ;
          if (p == "[DONE]") {
            console.log("openAI stream done") ;
            break ;
          }

          let d = JSON.parse(p) ;
        // console.log("openAI choices: " + d.choices) ;
          if (d.choices) {
            let t =  d.choices[0].text
          //  console.log("sending openAI text " + t) ;
            res.write(JSON.stringify({ok: true, type: "resultListSummary", results: {summary: t, done:false}})+ "\n") ;

          }
        }
      }  
    }
    else {
      while (true) {
          const { done, value } = await reader.read() ;
          //console.log("got getResultListSummaryChunked done:" + done + " value " + value) ;
          if (done) break;
          let latestText = new TextDecoder("utf-8").decode(value) ;
          //console.log("latestText now is: " + latestText) ;
          text +=  latestText ;
          //console.log("text received tot len " + text.length) ;
          if (text.endsWith("\n")) {
            //console.log("sending text:" + text) ;

            const objects = text.split("\n");
            let runningText = "" ;
            for (const obj of objects) {
              try {
                  runningText += obj;
                  if (runningText.length > 0) {
                      if (runningText.startsWith("data:")) // expected..
                        runningText = runningText.substring(5).trim() ;
                      let result = JSON.parse(runningText) ;
                      res.write(JSON.stringify({ok: true, type: "resultListSummary", results: {summary: result.content, done:false}})+ "\n") ;
                      //console.log("\n ********Received", result);
                  }
                  runningText = "";
              } catch (e) {
                console.log("summary chunk error: " + e + " on text: " + runningText)
                res.write(JSON.stringify({ok: true, type: "resultListSummary", error: e})+ "\n") ;
              }
            }
            text = "" ;       
          }
      }  
      // TODO shouldnt happen? if (text.length > 0) res.write(JSON.stringify({ok: true, type: "resultListSummary", results: text})+ "\n") ;
    }

    res.write(JSON.stringify({ok: true, type: "resultListSummary", results: {summary: '', done:true}})+ "\n") ;
              
    return true ;
  }
  catch (e) {
    console.log("Error in getResultListSummary Chunked: " + e ) ;
    res.write(JSON.stringify({ok: false , type: "resultListSummary", error: "" + e})+ "\n") ;
    return {summary: "Error " + e} ;    
  }
}


async function getHighlight(doc, question) {

  let query = "id:" + doc.id ;
  let selectData = "?wt=json&rows=1&q=id:" + doc.id + 
    "&fl=id&hl.fl=article&hl.q=" + encodeURIComponent(question) +
    "&hl.requireFieldMatch=false&hl.snippets=3&hl=true" ;

  console.log("getSnippet: " + appConfig.solr.getDocCoreUrl() + "/select" + selectData) ;

  let solrRes = null ;

  try {    
    solrRes = await axios.get(appConfig.solr.getDocCoreUrl() + "/select" + selectData) ;
  }
  catch (e) {
  console.log("Error solr snippet query " + e) ;
    if( e.response) console.log(e.response.data) ; 
    throw e ;
  }

  console.log("snippet status: " + solrRes.status) ;
  
  if ((solrRes.status == 200) && solrRes.data && solrRes.data.highlighting && 
          solrRes.data.highlighting["" + doc.id] && solrRes.data.highlighting["" + doc.id].article) {
    //console.log("id " + doc.id + " GOT HILITE " + JSON.stringify(solrRes.data.highlighting["" + doc.id])) ;
    let snippets = solrRes.data.highlighting["" + doc.id].article ;
    return snippets.join("... ") ;
  }
  throw "No snippets returned" ;
}

const chunkCodeVals = [
 -0.25597495, -0.09135562, -0.06959515, -0.055114333, -0.04315709, -0.031143378, -0.01993985, -0.010070613,
  -2.2745997E-4, 0.009587873, 0.019556874, 0.030583648, 0.042010102, 0.053408638, 0.06819765, 0.089414865 ] ;


async function getBestContent(doc, qVec, question) {

  if (doc.article.length < 1000) return doc.article ; //,article.length ;
  console.log("getBestContent just returns doc for this index") ;
  return doc.article.substring(0, 1000) ; 
/*
  let query = "id:" + doc.id ;
  let selectData = "?wt=json&rows=1&q=" + query + "&fl=id,offset,encodedVector" ;
  //console.log("getBestContent: " + appConfig.solr.getChunkCoreUrl() + "/select" + selectData) ;

  let solrRes = null ;
 
  try {    
    solrRes = await axios.get(appConfig.solr.getChunkCoreUrl() + "/select" + selectData) ;
  }
  catch (e) {
  console.log("Error solr chunk query " + e + "\non request: " + appConfig.solr.getChunkCoreUrl() + "/select" + selectData) ;
    if( e.response) console.log(e.response.data) ; 
    throw e ;
  }
 

  if (solrRes.status == 200) {  // solr returns not json - eg
    //... "offset":[0,1452,2858],
    //"encodedVector":[iIiI+YiImu2MmL7NuLmJmIiYuMiIiIqI2oi4nIiIqKuIq4iI2IiviKiMiIiIio6pqIiIyIiIiIioj4iJra6IioiOiImIutjK6IiYi8iczoibqc6Kioi4ieiIjYnciLuImKmKjouYi
    //  ...
    //  So we parse manually!
    //
    //console.log("got result for " + appConfig.solr.getChunkCoreUrl() + "/select" + selectData) ;
    //console.log(" data is " + (typeof solrRes["data"])) ;
    if (!(typeof solrRes["data"] == "string")) throw "no chunks" ;
    let t = solrRes["data"].replaceAll("\\n", " ").replaceAll("\\\"", '"') ;
    //console.log("t=" + t) ;
    let i = t.indexOf("\"offset\":[") ;
    if (i < 0) throw "no offset found" ;
    let j = t.indexOf("]", i) ;
    if (j < 0) throw "no end offset found" ;
    let offsets = t.substring(i+10, j).split(",") ;
    if (offsets.length <= 2) return doc.article ;  // only 2 chunks - no selection needed!

    for (let i=0;i<offsets.length;i++) offsets[i] = Number(offsets[i]) ;

    i = t.indexOf("\"encodedVector\":[") ;
    if (i < 0) throw "no encodedVector found" ;
    j = t.indexOf("]", i) ;
    if (j < 0) throw "no end encodedVector found" ;
    let vectors = t.substring(i+17, j).split(",") ;

    //console.log("got offsets " + JSON.stringify(offsets)) ; // + " and vecs " + JSON.stringify(vectors)) ;

    //console.log("for id " + doc.id) ; 
    // our summary is first chunk plus next best
    let highestScore = -5 ;
    let highestScoreIndex = -1 ;


    for (let vc=0;vc<vectors.length;vc++) {
      let binaryData = new Uint8Array(atob(vectors[vc]).split("").map(function (c) {
        return c.charCodeAt(0) ;
      }));
      //console.log("binary = " + binaryData) ;
      let embed = Array(768)  ;
      let k = 0 ;
      for (let i=0;i<384;i++) {
        let v = binaryData[i] ;
        let p = Math.trunc(v/16) ;
        let q = v % 16 ;
        embed[k++] = chunkCodeVals[p] ;
        embed[k++] = chunkCodeVals[q] ;
      }
      //console.log("embed = " + embed) ;

      normalise(embed) ; 
      let dist = innerProduct(qVec, embed) ;
      if ((vc > 0) && (dist > highestScore)) {
        highestScore = dist ;
        highestScoreIndex = vc ;
      }


      //console.log("VEC " + vc + " offset " + offsets[vc] + " dist " + dist.toFixed(5) + 
     //    ": " + " " +  doc.article.substring(offsets[vc], offsets[vc] + 64)) ;

    }
   // console.log("Highest score " + doc.article.substring(offsets[highestScoreIndex], offsets[highestScoreIndex] + 64)) ;

    let bestSum = doc.article.substring(0, offsets[1]) ; // first chunk, always
    if (highestScoreIndex < (offsets.length - 1)) 
        bestSum += " " + doc.article.substring(offsets[highestScoreIndex], offsets[highestScoreIndex + 1]) ;
    else bestSum += doc.article.substring(offsets[highestScoreIndex]) ;
    //console.log(" bestSum: " + bestSum) ;
    return bestSum ;
  }
  else throw "Error getting chunks " + solrRes.status ;
*/
}


function normalise(v) {

  let sums = 0 ;

  for (let i=0;i<v.length;i++) sums += v[i] * v[i] ;
  let scale = 1.0 / Math.sqrt(sums) ;
  for (let i=0;i<v.length;i++) v[i] *= scale ;   
	//console.log("normalise scale = " + scale + " length " + v.length) ;
}

function getNearestQuantValue(val) {
      
  // find first item < val 
  if (chunkCodeVals[7] <= val) { // incr until we find one greater
    for (let i=8;i<16;i++) {
      if (chunkCodeVals[i] >= val) {
        let lowerDiff = val - chunkCodeVals[i-1] ;
        let upperDiff = chunkCodeVals[i] - val ;
        return (lowerDiff < upperDiff) ? chunkCodeVals[i - 1] : chunkCodeVals[i] ;
      }
    }
    // none greater!
    return chunkCodeVals[15] ;
  }
  else {  // decr until we find one less than
    for (let i=6;i>=0;i--) {
      if (chunkCodeVals[i] < val) {
        let lowerDiff = val - chunkCodeVals[i] ;
        let upperDiff = chunkCodeVals[i+1] = val ;
        return (lowerDiff < upperDiff) ? chunkCodeVals[i] : [i + 1] ;
      }
    }
    // none less than!
    return chunkCodeVals[0] ;
   }   
}

async function getSummary(seq, doc, question, qVec, vectorSimilarity) { 

  if (vectorSimilarity < 0.5 /*.60*/) {   // semantic summary will probably be poor - try for a snippet instead

    try {
      let highlights = await getHighlight(doc, question) ;
      doc.summary = highlights.replaceAll("<em>", "").replaceAll("</em>", "").replaceAll(" ...", " ") ; // keep for list summary - maybe remove tags, ... ?
      console.log("id " + doc.id + " snippet: " + highlights) ;
      return {summary: "Snippet: " + highlights, seq: seq} ;
    }
    catch (he) {
      console.log("Lucene hiliter, falling back to summary.  Failed id: " + doc.id + " q: " + question + " err: " + he)
    }
  }

  if (!doc.summary) {
    try {
      doc.summary = await getBestContent(doc, qVec, question) ;
    }
    catch (ebc) {
      console.log("failed to get best content doc " + doc.id + " err: " + ebc) ;
      doc.summary = doc.article.substring(0, 1000) ;
    }  
  }

  let contentToSummarise = (doc.summary.length > 1200) ? doc.summary.substring(0, 1200) : doc.summary ;
  // console.log("====< GET SUMMARY seq " + seq + " FROM " + appConfig.summaryURL + " FOR "  + cleanArticle) ;
  var eRes = null ;
  try {
    var prompt ;
    var startResponseMarker ;
    switch (appConfig.inferenceEngine) {
      case "llama.cpp":
          prompt = "<|system|> You are a helpful assistant who summarises an article based only on the article " +
                  // "contents in no more than 60 words. " +
                  "contents in no more than 60 words for a user who found this article when issuing a search for: " +
                  "\"" + cleanseVeryLite(question) + "\".  Confine your summary to content contained in the article. " +
                  "Never provide a preamble before the summary - just summarise the article.</s> <|user|> <article> " +
                  contentToSummarise +
                  "</article> " +
                  "</s> <|assistant|>" ;
          break ;
      case "vllm":
      case "llama.cpp-chatML":
      case "openAI":
          /* some non instruct/chat model model..
          prompt = "Given this article: [ARTICLE STARTS] " + contentToSummarise +
                   " [ARTICLE ENDS] and this question: [QUESTION STARTS] " + cleanseVeryLite(question) +
                   " [QUESTION ENDS], then a short summary of the article no more than 60 words long and based only on the article contents" +
                   " for a person who issued that question is: [ANSWER STARTS] " ;
                   */

          // chat instruct model eg openhermes

          prompt = "<|im_start|>system\n" +
              "You are a helpful assistant who summarises an article based only on the article " +
              "contents in no more than 60 words for a user who found this article when issuing a search for: " +
              "\"" + cleanseVeryLite(question) + "\" " +
              "Never provide a preamble before the summary - just summarise the article.<|im_end|>\n" +
              "<|im_start|>user\n<article> " +
              contentToSummarise +
              "</article> <|im_end|>\n" +
              "<|im_start|>assistant\n" ;
          startResponseMarker = "<|im_start|>assistant" ;              


          break ;


      default:
          throw "C Unexpected inference engine: " + appConfig.inferenceEngine ;
    }

    console.log("Summary prompt: " + prompt) ;


    var data ;
    switch (appConfig.inferenceEngine) {
      case "llama.cpp":
      case "llama.cpp-chatML":
        data =  {
          "prompt":prompt,              
          "temperature":0.0,
          "n_predict":80,
          "stream":false,
          "repeat_penalty":1.1,
          "repeat_last_n":64,
          "cache_prompt":false,
          "tokens_cached":0
//,"system-prompt":{"prompt": "Be helpful.", "anti_prompt": "user:", "assistant_name": "assistant:"} // test
        }
        break ;
      case "vllm":
        data = {
          "prompt": prompt,
// vllm 0.6.3          "use_beam_search": false,              
          "temperature":0.0,
          "n":1,
          "max_tokens":80,
          "stream":false,
          skip_special_tokens: false,                         // skip and stop are attempts to stop startling model from seeming to loop
          stop: ["<|im_end|>"]                                  // open-hermes-neural-chat blend emits this
    //,"system-prompt":{"prompt": "Be helpful.", "anti_prompt": "user:", "assistant_name": "assistant:"} // test
        } ;
        break ;        

      case "openAI":
        data = {
          "model": appConfig.modelName,
          "prompt": prompt,
          "max_tokens": 80,
          "stream":false,
          "temperature": 0
        }
        break ;
      default:
          throw "B Unexpected inference engine: " + appConfig.inferenceEngine ;
    }


    eRes = await axios.post(appConfig.summaryURL, 
      data,
      { headers: {'Content-Type': 'application/json'}
      }  
    ) ;
    //console.log("back from get sum") ;
    if (!eRes.status == 200) throw "Cant get summary, server returned http resp " + eRes.status ;

    switch (appConfig.inferenceEngine) {
      case "llama.cpp":
      case "llama.cpp-chatML":
        if (!eRes.data || !eRes.data.content) throw "Cant get summary, server returned no data" ;
        return {summary: "Summary: " + eRes.data.content, seq: seq} ;

      case "vllm":
       if (!eRes.data || !eRes.data.text) throw "Cant get summary, server returned no data" ;
       let r = eRes.data.text[0] ;
       if (startResponseMarker) {
        let rs = r.indexOf(startResponseMarker) ;
        if (rs >= 0) r = r.substring(rs + startResponseMarker.length) ;
       }
       let ri = r.indexOf("[ANSWER STARTS]") ;
       if (ri >= 0) r = r.substring(ri+15).trim() ;
       
       r = r.replaceAll("60-word summary:", "").replaceAll("[ANSWER ENDS]", "") ;
              
       return {summary: "Summary: " + r, seq: seq} ;

      case "openAI":
        if (!eRes.data || !eRes.data.choices) throw "Cant get summary, server returned no data" ;
        let ro = eRes.data.choices[0].text ;
        let roi = ro.indexOf("|<|im_end|>") ;
        if (roi > 0) ro = ro.substring(0, roi) ;
        return {summary: "Summary: " + ro, seq: seq} ;
/*
      {"id":"cmpl-467e1adf93a64673987ce84d179b23b0","object":"text_completion","created":1742540910,
      "model":"neuralmagic/gemma-2-9b-it-FP8",
      "choices":[{"index":0,"text":"\n\nThere are **3** \"",
      "logprobs":null,"finish_reason":"length","stop_reason":null,"prompt_logprobs":null}],
      "usage":{"prompt_tokens":14,"total_tokens":21,"completion_tokens":7,"prompt_tokens_details":null}}
*/
       default:
        throw "at A Unexpected inference engine: " + appConfig.inferenceEngine ;
    }
  }
  catch (e) {
    console.log("Error in getSummary seq = " + seq + ": " +e + "\neRes:" + eRes) ;
    return {summary: "AI summary failed.  Article start:" +
     ((doc.article.length > 300) ? (doc.article.substring(0, 250) + "...") : doc.article), seq: seq} ;    
  }
}


function innerProduct(v1, v2) {

  let r = 0 ;
  for (let i=0;i<v1.length;i++) r +=  v1[i] * v2[i] ;
  
  return r ;
}

async function initSearch(req, res) {

  console.log("in initsearch") ;
  let stxt = '' ;
  let keywordScaling = 0.85 ;
  let facets = [] ;

  if (!req.query) {
    res.json({ok: false, error:"no search text"}) ;
    return ;
  }
  
  if (req.query.stxt) stxt = req.query.stxt ;
  if (req.query.keywordScaling) keywordScaling = req.query.keywordScaling ;
  if (req.query.facet) {
    let t = req.query.facet ;
    if (!Array.isArray(t)) t = [t] ;
    for (let f of t) {
      let i = f.indexOf(':') ;
      if (i > 0) facets.push({fn: f.substring(0, i), fv: decodeURIComponent(f.substring(i+1))}) ;
    }
  }

  let origQuestion = stxt ;

  stxt = cleanseLite(stxt).trim() ;
  if (stxt.length < 1) {
    stxt = "*" ;
    //res.json({ok: false, error:"no search text"}) ;
    //return ;
  }

  let qVec = await getEmbedding(stxt) ;
  //console.log("qVec len " + qVec.length) ;
 
  let fancyQ = "&q={!bool filter=$retrievalStage must=$rankingStage}" +
  "&retrievalStage={!bool should=$lexicalQuery should=$vectorQuery}" +
  "&rankingStage={!func}sum(query($normalisedLexicalQuery),query($normalisedVectorQuery))" +
  "&normalisedLexicalQuery={!func}scale(query($lexicalQuery),0," + (1.0 - keywordScaling) + ")" +
  "&normalisedVectorQuery={!func}scale(query($vectorQuery),0," + keywordScaling + ")" +
  "&lexicalQuery={!type=edismax qf='heading^2 article^1 headingStemmed^1.5 articleStemmed^0.5' " +
    "pf='heading^4 article^1.5 headingStemmed^2.0 articleStemmed^0.8'}" + stxt +
  "&vectorQuery={!knn f=vector topK=100}" +  JSON.stringify(qVec) ;


  if (facets.length > 0) {
    // query = "(" + query + ")" ;
     for (let f of facets) {
       
       switch (f.fn) {
         case "year":  case "category": // case "person": case "org": case "location": case "misc":
           //query += " AND " + f.fn + ":\"" + f.fv + "\"" ;
           fancyQ += "&fq=" + f.fn + ":\"" + f.fv + "\"" ;
         default: // ignore
       }
     }
    }

  /*
  let fancyQ = "&q={!bool filter=$retrievalStage must=$rankingStage}" +
  "&retrievalStage={!bool should=$lexicalQuery should=$vectorQuery}" +
  "&rankingStage={!func}sum(query($normalisedLexicalQuery),query($vectorQuery))" +
  "&normalisedLexicalQuery={!func}scale(query($lexicalQuery),0," + (1.0 - keywordScaling) + ")" +
  "&lexicalQuery={!type=edismax qf='heading^2 article^1 headingStemmed^1.5 articleStemmed^0.5' " +
    "pf='heading^4 article^1.5 headingStemmed^2.0 articleStemmed^0.8'}" + stxt +
  "&vectorQuery={!knn f=vector topK=100}" +  JSON.stringify(qVec) ;
*/


  /*
  let fancyQ = "&q = {!bool should=$lexicalQuery should=$vectorQuery}" +
  "&lexicalQuery = {!type=edismax qf='heading^2 article^1 headingStemmed^1.5 articleStemmed^0.5' " +
    "pf='heading^4 article^1.5 headingStemmed^2.0 articleStemmed^0.8'}" + stxt +
  "&vectorQuery = {!knn f=vector topK=10}"  +  JSON.stringify(qVec) ;
 */
  let selectData = 
  "&wt=json&rows=10" +
  fancyQ + 
  "&q.op=AND" +
  "&facet=true&facet.field=year&facet.field=category" +
  "&fl=id,issue,title,category,heading,vector,article,score" ;

  /*
  let query = "({!knn f=vector topK=100}" + JSON.stringify(qVec) + ")^" + keywordScaling + 
 
              " OR (" +
                "articleStemmed:(" + stxt + ")^0.1 OR headingStemmed:(" + stxt + ")^0.4 OR " +
                "article:(" + stxt + ")^0.3 OR heading:(" + stxt + ")^1 OR " +
                "articleStemmed:\"" + stxt + "\"~5^0.3 OR headingStemmed:\"" + stxt + "\"~5^0.8 OR " +
                "article:\"" + stxt + "\"~5^0.9 OR heading:\"" + stxt + "\"~5^2 " +
              ")^" + (( 1 - keywordScaling) / 2) ;
     
  if (facets.length > 0) {
   // query = "(" + query + ")" ;
    for (let f of facets) {
      
      switch (f.fn) {
        case "year":  case "category": // case "person": case "org": case "location": case "misc":
          //query += " AND " + f.fn + ":\"" + f.fv + "\"" ;
          query += "&fq=" + f.fn + ":\"" + f.fv + "\"" ;
        default: // ignore
      }
    }
    //console.log("query-" + query) ;
  }
  let selectData = 
    "&wt=json&rows=10" +
    "&q=" + query + 
    "&q.op=AND" +
    "&facet=true&facet.field=year&facet.field=category" +
    "&fl=id,issue,title,category,heading,vector,article,score" ;

    */
  console.log("\n============================\n search query part: " + selectData.replace(/\[.*\]/, "[]..vectors..]")  + "\nurl: " + appConfig.solr.getDocCoreUrl() + "/select") ;



  let solrRes = null ;
  
  try {
    solrRes = await axios.post(
      appConfig.solr.getDocCoreUrl() + "/select",
      selectData) ;
  }
  catch (e) {
    console.log("Error solr query " + e) ;
    if( e.response) console.log(e.response.data) ; 
    return ;
  }

  console.log("search status: " + solrRes.status) ;
  
  if ((solrRes.status == 200) && solrRes.data && solrRes.data.response && solrRes.data.response.docs) {

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked'
    }) ;


    // only show/keep top 10  ok 20
    let docList = solrRes.data.response.docs.splice(0, 10) ;  // (0, 10)
    solrRes.data.response.docs = docList ;
    
    for (let i = 0;i<docList.length;i++) {
      let doc = docList[i] ;
      if (doc.article) {
        doc.bytes = doc.article.length ;
      }
    }
 
    // now get vector similarities

    let similarities = [] ;

    for (let i=0;i<docList.length;i++) 
      similarities[i] = innerProduct(docList[i].vector, qVec) ;    

    // kick off summaries...
 
    let pList = [] ;
    for (let i=0;i<docList.length;i++) {

      var pr ;
      let ac =  cleanseVeryLite(docList[i].article) ;
      //console.log("KOS, i="+i+" ac="+ac) ;
      if (ac.length < 400) {
        docList[i].summary = ac ;
        pr = new Promise(function(resolve, reject) {
          resolve({summary: "Full text: " + ac, seq: i});
        });
      }
      else pr = getSummary(i, docList[i], origQuestion, qVec, similarities[i]) ;
      //console.log("pr typeof is " + (typeof pr)) ;
      //console.log("pr: " + pr) ;
      pList[i] = pr ;
    }
 
    res.write(JSON.stringify({ok: true, type: "results", results:solrRes.data}) + "\n") ;
 


    res.write(JSON.stringify({ok: true, type: "similarities", results:similarities}) + "\n") ;
  
    // now wait for summaries 

    Promise.all(pList.map(promise => {      // as soon as first finishes, process it
      promise.then((result) => { 
        res.write(JSON.stringify({ok: true, type: "summary", results: result})+ "\n") ;} )
    }))
    .catch(err => {
      console.log("ERR summary promise:" + err) ;
    });

    // dont issue chat req until summaries are back!
    await Promise.all(pList) ; // dont pass until all are finished - cant close res!!

    let resultListPromise = getResultListSummaryChunked(docList, origQuestion, res) ;
    let rsSummary = await resultListPromise ;
    console.log("END rsSummaryChunked " + rsSummary) ;
    //res.write(JSON.stringify({ok: true, type: "resultListSummary", results: rsSummary})+ "\n") ;    

 
    /*    boring way - but doesnt send asap
    for (let i=0;i<pList.length;i++) {
      let pr = pList[i] ;
      //console.log("WAIT pr typeof is " + (typeof pr)) ;
      //console.log("WAIT pr: " + pr) ;
      let result = await pr ;
      //console.log("got summary  for " + result.seq + " >>>>>>>>" + result.summary) ;
      res.write(JSON.stringify({ok: true, type: "summary", results: result})+ "\n") ;
    }
*/

    res.end("\n") ;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanseLite(parm) {

	if (typeof(parm) === 'string') return parm.replace(/[^-A-Za-z0-9 '"():]/g, " ") ;
	return "" ;
}

function cleanseVeryLite(parm) {

	if (typeof(parm) === 'string') return parm.replace(/[^-A-Za-z0-9 .,\!\?'"():;]/g, " ") ;
	return "" ;
}

module.exports.init = init ;
