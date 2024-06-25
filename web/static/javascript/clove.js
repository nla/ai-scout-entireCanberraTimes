//alert("Hello Clove") ;

let CONSTANT_SPINNER = "<img src='static/images/24px-spinner-0645ad.gif' style='margin-top:6px;background:#ffffff;cursor: default;height:24px;width:24px'/>" ;


let Global_FACETS = [] ;
let Global_SEARCH_IN_PROGRESS = false ;
let Global_SEARCH_SEQ = 0 ;   // so we can ignore tardy responses from old searches
let Global_ARTICLE_IDS = [] 

window.addEventListener("load", (event) => {
  //console.log("loaded") ;
  document.getElementById("searchButton").addEventListener("click", searchClick) ;

  document.getElementById('stxt').addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      searchClick() ;
    }
  })

  document.addEventListener('click', function (e) {
   
    if (e.target.className == 'fclicktarget') {
      let t = e.target ;
      let v = t.innerText ;
      let n = t.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].innerText ;
      addFacet(n, v) ;
    }
    else if (e.target.className == 'removefacet') {
      console.log("click target " + e.target) ;

      let n = e.target.name ;
      let v = e.target.value ;
      console.log("to remove " + f) ;
      for (let i=0;i<Global_FACETS.length;i++) {
        if ((Global_FACETS[i].n == n) && (Global_FACETS[i].v == v)) {
          Global_FACETS.splice(i, 1) ;
          console.log("REMOVED FACET " + i) ;
          break ;
        }
      }

      searchClick() ;
    }
  }) ;

  // initialise facets

  let t = window.location.href ; 
  let i = t.indexOf('?') ;
  if (i >= 0) {
    let q = t.substring(i+1).replaceAll("#", "") ;
    let start = 0 ;
    while (true) {
      i = q.indexOf("facet=", start) ;
      if (i < 0) break ;
      i += 6 ;
      let j = q.indexOf(':', i) ;
      if (j < 0) break ;
      let fn = q.substring(i, j) ;
      let k = q.indexOf('&', j) ;
      let fv = (k > 0) ? q.substring(j+1, k) : q.substring(j+1) ;
      addFacet(fn, decodeURIComponent(fv)) ;
      start = i  ;
    }
  }
  t = ((i > 0) ? t.substring(0, i) : t) + '?stxt=' + encodeURIComponent(stxt) + '&keywordScaling=' + keywordScaling ;
  for (f of Global_FACETS) 
      t += "&facet=" + f.n + ":" + encodeURIComponent(f.v) ;


  if (document.getElementById('stxt').value) searchClick() ; // initial search is ready (passed on url)

}) ;

function addFacet(n, v) {
  console.log("add facet " + n + ":" + v) ;
  Global_FACETS.push({n:n,v:v}) ;
  searchClick() ;
}

async function searchClick() {

  if (Global_SEARCH_IN_PROGRESS) {
    console.log("Search already in progress - ignored") ;
    return ;
  }

  Global_SEARCH_IN_PROGRESS = true ;
  let thisSearchSeq = ++Global_SEARCH_SEQ ;

  document.getElementById("searchButton").innerHTML = CONSTANT_SPINNER ;
  
  document.getElementById("results").innerHTML = "<centre><H1>Search in progress - please wait</H1></centre" ;

  let stxt = document.getElementById('stxt').value ;
  let keywordScaling =  document.getElementById('keywordScaling').value ;
  console.log("got search for " + stxt + "  / " + keywordScaling) ;

  // update url/history

  let t = window.location.href ; 
  let i = t.indexOf('?') ;
  t = ((i > 0) ? t.substring(0, i) : t) + '?stxt=' + encodeURIComponent(stxt) + '&keywordScaling=' + keywordScaling ;
  for (f of Global_FACETS) 
      t += "&facet=" + f.n + ":" + encodeURIComponent(f.v) ;
  // console.log("OLD " + window.location.href + " NEW " + t + " " + ((window.location.href == t))) ;
  if (window.location.href != t) window.history.pushState('', '', t) ;

  let q = "?stxt=" + encodeURIComponent(stxt) +  "&keywordScaling=" + encodeURIComponent(keywordScaling) ;
  for (f of Global_FACETS) 
    q += "&facet=" + f.n + ":" + encodeURIComponent(f.v) ;

  const response = await fetch("search/initSearch" + q);

  const readableStream = response.body ;
  const reader = readableStream.getReader() ;
  let text = "" ;
  while (true) {
      const { done, value } = await reader.read() ;
      if (done) console.log("got resp done:" + done) ; // + " value " + value) ;
      if (done) break;
     // console.log("thisSearchSeq=" + thisSearchSeq + " Global_SEARCH_SEQ=" + Global_SEARCH_SEQ) ;
      if (thisSearchSeq != Global_SEARCH_SEQ) {
        // we're receiving for an old search.  We're never going to show the contents, so ignore..
        console.log("Received response for an old search seq " + thisSearchSeq + " - now at " + Global_SEARCH_SEQ) ;
        continue ;
      }
      text += new TextDecoder("utf-8").decode(value) ;
      //console.log("text received tot len " + text.length) ;
      if (text.endsWith("\n")) {
        processReceivedContent(text) ;
        text = "" ;       
      }
  }  
  if (text.length > 0) processReceivedContent(text) ;

}

function processReceivedContent(text) {

  const objects = text.split("\n");
  let runningText = "" ;
  for (const obj of objects) {
    try {
        runningText += obj;
        let result = JSON.parse(runningText) ;
        process(result) ;
        //console.log("\n ********Received", result);
        runningText = "";
    } catch (e) {
      // Not a valid JSON object
    }
  }
}

function process(result) {

  let resultsDiv = document.getElementById("results") ;
  if (!result.ok) {
    document.getElementById('status').innerHTML = "Error: " + JSON.stringify(result) ;
    return ;
  }
  if (!result.type) {
    resultsDiv.innerHTML = "Error no type in response: " + JSON.stringify(result) ;
    return ;
  }  
  switch (result.type) {
    case 'results':           buildSearchResults(result.results) ; break ;
    case 'similarities':      showSimilarities(result.results) ; break ;
    case 'summary':           showSummary(result.results) ; break ;
    case 'resultListSummary': showResultListSummary(result.results) ; break ;
    default:                  resultsDiv.innerHTML = "Unknown type in result: " + result.type ;
  }
}

function buildSearchResults(results) {

  buildSkeleton() ;

  let t = "" ;
  for (f of Global_FACETS) 
    t += "<input type='checkbox' class='removefacet' checked name='" + f.n + "' value='" + f.v + "'>" + f.n + ": " + f.v + "</input><BR/> " ;
  document.getElementById("inUseFacets").innerHTML = t ;

  document.getElementById("summary").innerHTML = "" + results.response.numFound + 
      " results found, showing " +  results.response.docs.length ;

  let resultList = [] ;
  Global_ARTICLE_IDS = [] ;
  for (let i=0;i<results.response.docs.length;i++) {
    resultList.push(formatResultDoc(i, results.response.docs[i])) ;
    Global_ARTICLE_IDS.push(results.response.docs[i].id) ;
  }

  document.getElementById("resultList").innerHTML = "<OL>" + resultList.join(" ") + "</OL>" ;

  let fs = "" ;
  const facetFields = ["year", "category"] ; // , "person", "org", "location", "misc"] ;
  for (let i=0;i<facetFields.length;i++) {
    let ff = facetFields[i] ;
    let f = results.facet_counts.facet_fields[ff] ;
    if (f) {
      fs += "<DIV><DIV class='fname'>" + ff + "</DIV><DIV class='fl'><UL class='flist'>" ;
      if (ff == "year") { // sort numerically
        let arr = [] ;
        for (let j=0;j<f.length;j=j+2) arr.push({yr: f[j], c:f[j+1]})

        let sarr = arr.sort((a, b) => (a.yr < b.yr) ? -1 : (a.yr > b.yr) ? 1 : 0) ;

        for (let j=0;j<sarr.length;j++) {
          f[2*j] = sarr[j].yr ;
          f[2*j+1] = sarr[j].c ;
        }
      }
      for (let j=0;j<f.length;j=j+2) {
        if (f[j+1] < 1) continue ;
        fs += "<LI><div class='fvcount'>" + Number(f[j+1] ).toLocaleString() +
           "</div> <div class='fvname'><a class='fclicktarget' href='#'>" + f[j] + "</a></div></LI>" ;
      }
      fs += "</UL></DIV></DIV>"
    }
  }
  document.getElementById("facets").innerHTML = fs ;

  if (Global_SEARCH_IN_PROGRESS) { // time to turn that off..
    Global_SEARCH_IN_PROGRESS = false ;
    document.getElementById("searchButton").innerHTML = "<span id='searchText' class='searchText'>Search</span>" ;
   }  
}

function formatResultDoc(seq, result) {

    let r = "<LI><div class='rlist'>" + formatDate(result.issue) + " <a href='https://trove.nla.gov.au/newspaper/article/" + result.id + "'>" + 
              ((result.heading ? result.heading : "No heading")) + "</a> " + 
            " <div class='scores'>" + result.category + ", " + Math.floor(result.bytes / 5.5) + " words, " +
                "score raw: " +  result.score.toFixed(2) + ", semantic: <span id='sem" + seq + "'></span></div>" +
            " <br clear='all'/>" +
            "<div class='summary' id='sum" + seq + "'><div class='pending'>Pending..</div></div>" +
            "</DIV></LI>" ;
    return r ;
}


function showSimilarities(simList) {

  for (let i=0;i<simList.length;i++) document.getElementById("sem" + i).textContent = simList[i].toFixed(3) ;
}

function showSummary(result) {

   document.getElementById("sum" + result.seq).innerHTML = result.summary ;


}


let GLOBAL_SUMMARY_START = 0 ;  // used for postprocessing response
let GLOBAL_SUMMARY = "" ;

function showResultListSummary(result) {

  //console.log("result summary:" + result.summary) ;
  result.summary = result.summary.replaceAll("\\n", "\n").replaceAll("\\\"", "\"") ;
  let chatEle = document.getElementById("chat") ;
  if (document.getElementById("waitingForFirstChat") != null) { // first (or only) chunk
    chatEle.innerHTML = result.summary ;
    GLOBAL_SUMMARY_START = 0 ;
    GLOBAL_SUMMARY = result.summary ;
  }
  else  {
    GLOBAL_SUMMARY += result.summary ;

    // fixing the text...
    let i = (result.done) ? GLOBAL_SUMMARY.length : GLOBAL_SUMMARY.lastIndexOf("\n") ; // rest of string if finished, else last new line

   // console.log("GLOBAL_SUMMARY_START " + GLOBAL_SUMMARY_START + " i " + i + " GLOBAL_SUMMARY " + GLOBAL_SUMMARY) ;
    if (i > GLOBAL_SUMMARY_START) {
      let stuffAtTheEnd = (i >= GLOBAL_SUMMARY.length) ? "" : ("<BR>" + GLOBAL_SUMMARY.substring(i+1)) ;
      let stuffAtTheStart = (GLOBAL_SUMMARY_START > 0) ? GLOBAL_SUMMARY.substring(0, GLOBAL_SUMMARY_START) : "" ;
      let t = GLOBAL_SUMMARY.substring(GLOBAL_SUMMARY_START, i) ; // we process this

      t = t.replaceAll("\n", "<BR>").replaceAll("[", "<BR>[") ;
      if ((GLOBAL_SUMMARY_START == 0) && (t.indexOf("Answer:") == 0)) t = t.substring(7) ; // strip leading Answer: which appears sometimes
  
      /*
      let start = 0 ;
      while (start < t.length) {
        let i = t.indexOf("article ", start) ;
        let j = t.indexOf("Article ", start) ;
        if (i < 0) i = j ;
        if ((j > 0) && (j < i)) i = j ;
        if (i < 0) break ;
  
        let k = t.charAt(i + 8) ;
        if ((k >= '1') && (k <= '8')) {
            t = t.substring(0, i) + "<a href='https://trove.nla.gov.au/newspaper/article/" + Global_ARTICLE_IDS[Number(k) -1] +
                "'>" + t.substring(i, i+10) + "</a>" + t.substring(i+10) ;
            start = i + 10 + 52 + ("" + Global_ARTICLE_IDS[Number(k) -1]).length + 2 + 2 ;
        }
        else start = i + 6 ;
      }
      */

      let start = 0 ;
      while (start < t.length) {
        let i = t.indexOf("rticle", start) ;
        if (i < 1) break ;
        let ch = t.charAt(i-1) ;
        if (!((ch == 'a') || (ch == 'A'))) {
          start = i + 5 ;
          continue ;
        }
        if ((i + 8) >= t.length) break ;
        start = i + 6 ;
        ch = t.charAt(start) ;
        if (ch == ' ') start++ ;
        else if (ch == 's') {
          start++ ;
          ch = t.charAt(start) ;
          if (ch != ' ') continue ;
          start++ ;
        }
 
        let k = t.charAt(start) ;
        if ((k >= '1') && (k <= '8')) {
            t = t.substring(0, i-1) + "<a href='https://trove.nla.gov.au/newspaper/article/" + Global_ARTICLE_IDS[Number(k) -1] +
                "'>" + t.substring(i-1, start+1) + "</a>" + t.substring(start+1) ;
            start = i + 10 + 52 + ("" + Global_ARTICLE_IDS[Number(k) -1]).length + 2 + 2 ;
        }
      }      

      GLOBAL_SUMMARY = stuffAtTheStart + t ;
      GLOBAL_SUMMARY_START = GLOBAL_SUMMARY.length ; // remember
      GLOBAL_SUMMARY += stuffAtTheEnd ;
    }

    chatEle.innerHTML = GLOBAL_SUMMARY ;
  }
}

function  buildSkeleton() {

  let resultsDiv = document.getElementById("results") ;
  let r = "<div id='summary' style='margin-top:1em;margin-bottom:1em'></div>" +
          "<div id='status' class='status'></div>" +
          "<table>" +
            "<tr>" +
              "<td width='20%'><div id='inUseFacets'></div><div id='facets'>Facets</div></td>" +
              "<td width='50%'><div id='resultList'>Result list</div></td>" +
              "<td width='30%'><div id='chat' class='chat'>Result summary</p><center>" + CONSTANT_SPINNER +
                "</center><div id='waitingForFirstChat'></p></div></td>" +
            "</tr>" +
          "</table>" ;
    resultsDiv.innerHTML = r ;
}

function formatDate(yyyyHmmHdd) {

  return yyyyHmmHdd.substring(8) + yyyyHmmHdd.substring(4, 8) + yyyyHmmHdd.substring(0, 4) ;
}

