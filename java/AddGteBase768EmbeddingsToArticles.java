import java.util.* ;
import java.util.concurrent.* ;
import java.io.* ;
import java.util.zip.* ;
import java.net.* ;

// 1May24 - adapted from newspapers/AddBgeBase768Embeddings to use Gte embeddings, forget about entities
// will read extracts from newspapers/data - 2 runs, one for the original 1970- file, the other for the 1926-1969 file
 

/*
 javac -cp . AddGteBase768EmbeddingsToArticles.java
 java  -cp . AddGteBase768EmbeddingsToArticles  ../newspapers/data/CTArticles1970OnwardsWithEntities.gz data/CT1970-WithGTE.gz ent
 5 hr elapsed
Done articles 1785580: ****ARTICLE id:127263391, issueDate:1994-12-31, category:Article, title: The Canberra Times (ACT : 1926 - 1995), heading: Emu Ridge shops face onslaught of crime, subheadings: 
AddGteBase768EmbeddingsToArticles ended articlesProcessed: 1785580
 
java  -cp . AddGteBase768EmbeddingsToArticles  ../newspapers/data/CTArticlesTo1969.gz data/CT1926-169WithGTE.gz raw
4hr 50min elapsed (mostly concurrrent with 1970 run), 31min CPU (java)
GPU ~50% busy with 2 concurrent jobs

Done articles 1386475: ****ARTICLE id:107911228, issueDate:1969-12-31, category:Detailed lis, title: The Canberra Times (ACT : 1926 - 1995), heading: radio, subheadings: 2CA Midnight- 2pm
AddGteBase768EmbeddingsToArticles ended articlesProcessed: 1386475


infinity embedding region ddidnt use much mem:
 0   N/A  N/A   1409839      C   ...onda3/envs/infinityMay24/bin/python     1630MiB

 */
public class AddGteBase768EmbeddingsToArticles {

	public static void main(String[] args) throws Exception {
	
		new AddGteBase768EmbeddingsToArticles(new File(args[0]), new File(args[1]), args[2]) ;
	}
	
	int fatalErrors = 0 ;

	AddGteBase768EmbeddingsToArticles(File in, File out, String runType) throws Exception {
			
		System.out.println("AddGteBase768EmbeddingsToArticles in: " + in + ", out: " + out + " inputType: " + runType) ; 
    boolean raw = true ;
    if (runType.equals("ent")) raw = false ;
    else if (!runType.equals("raw")) throw new Exception("unexpected runType") ;

		BufferedReader br ;
	    if (in.getName().endsWith(".gz")) 
    	br = new BufferedReader(new InputStreamReader(new GZIPInputStream(new FileInputStream(in)))) ;
	    else br = new BufferedReader(new FileReader(in)) ;

      if (out.exists()) throw new Exception("Wont overwrite file " + out) ;
	    PrintWriter pr =	new PrintWriter(new GZIPOutputStream(new FileOutputStream(out))) ;

	    int articlesProcessed = 0 ;
			String aheader = null ;

	    r: while (true) {
	    	String s = br.readLine() ;	    	
	    	if (s == null) break ;
	    	if (s.length() == 0) continue ;
	    	//System.out.println("s1=" + s) ;
	 			if (!s.startsWith("****ARTICLE id:")) throw new Exception("Expected article start, got " + s) ;

	 			// article to process..

	 			aheader = s ; 
	 			
	 		
        if (raw) {  
          // accumulate text 
          StringBuffer atb = new StringBuffer(32000) ;
          while (true) {
            s = br.readLine() ;
            if (s == null) break ;
            if (s.startsWith("****ARTICLE id:")) { // end of prev article
              if (atb.length() > 0) {
                String art = cleanse(atb.toString()) ;
                String vector = getVector(art, aheader) ;
                pr.println(aheader) ;
                pr.println(art) ;
                pr.println("***Vector" + vector) ; // NOTE - no space after Vector! (historical consistency)
                pr.println() ;  // empty line
                atb.setLength(0) ;
                articlesProcessed++ ;
                if ((articlesProcessed % 100) == 0) System.out.println("Processed #" + articlesProcessed) ;
              }
              aheader = s ;
            }
            else {
              if (atb.length() > 0) atb.append(" ") ;
              atb.append(s) ;
            }      
          }
          if (atb.length() > 0) { // last one..
            
            String art = cleanse(atb.toString()) ;
            String vector = getVector(art, aheader) ;
            pr.println(aheader) ;
            pr.println(art) ;
            pr.println("***Vector" + vector) ; // NOTE - no space after Vector! (historical consistency)
            pr.println() ;  // empty line
            articlesProcessed++ ;
          }
        }
        else {
          pr.println(aheader) ;

          String atext = br.readLine() ; // this is the article text..
          pr.println(atext) ; 

          while (true) { // entities etc
            s = br.readLine() ;	 
            //System.out.println("Read line:" + s) ;		
            if (s == null) break ;
            if (s.startsWith(" ***Entity")) continue ; // IGNORE - not pr.println(s) ;
            else if (s.length() == 0) { // startsWith(" ***article len ")) {
              // got all the article text - generate vector
              
              String vector = getVector(atext, aheader) ;
              pr.println("***Vector" + vector) ; // NOTE - no space after Vector! (historical consistency)
              pr.println(s) ; // then the article len line (just copy)
              pr.println() ; //(historical consistency)
              articlesProcessed++ ;
              if ((articlesProcessed % 100) == 0) System.out.println("Processed #" + articlesProcessed) ;
              atext = null ;
              break ; // start next
            }
            //else if (s.length() == 0) throw new Exception("crazy empty line article " + aheader) ;
            else atext += " " + atext ; // more article text
          }
        }
	 		} 
      br.close() ;
	 		System.out.println("Done articles " + articlesProcessed + ": " + aheader) ;
	
			pr.flush() ;
			pr.close() ;
			System.out.println("AddGteBase768EmbeddingsToArticles ended articlesProcessed: " + articlesProcessed) ;
    }
    
    
    String cleanse(String s) {

        s = s.replaceAll("[^\\- \\&A-Za-z0-9'\\.,;:\\?\\!\\(\\)\\[\\]/]", " ")
        .replaceAll("\\s\\s+", " ") ;
 
        s = cleanArticle(s).replaceAll("\\s\\s+", " ") ; ;
        return s ;
    }

    String cleanArticle(String s)  {
      // replace xxx- yy with xxxyy
      return s.replaceAll("\\b([A-Za-z]{2,8})\\-\\s([A-Za-z]{2,8})\\b", "$1$2")   
      // and 4 or more isolated chars or pairs of chars with nothing (hope to remove ocr noise)
     .replaceAll("(?i)\\b(to|be|if|a|it|is|he|an|of|on|am|pm|by|do|go|ha|in|me|my|no|oh|ok|so|us|we)\\b", "**$1")  
     .replaceAll("\\b[^\\s]{1,2}\\s[^\\s]{1,2}\\s[^\\s]{1,2}\\s[^\\s]{1,2}\\b", " ") 
     .replaceAll("\\*\\*", "") ;          

    }


    String getVector(String atext, String aheader) throws Exception {
    
     // System.out.println("\ngetVector for " + aheader + "\n" + atext) ;

      float[] vector = getEmbedding(atext) ;

			// flatten vector to string
			StringBuffer sb = new StringBuffer(16000) ;
			sb.append("" + vector[0]) ;
			for (int i=1;i<vector.length;i++) sb.append("," + vector[i]) ;
			return sb.toString() ;
		}
			



  float[] getEmbedding(String s) throws Exception {

    for (int maxLen = 4000;maxLen > 500; maxLen = maxLen - 200) {

      String textForEmbedding = (s.length() < maxLen) ? s : s.substring(0, maxLen) ;

      String req = "{\"model\":\"Alibaba-NLP/gte-base-en-v1.5\"," + 
          "\"input\": [\"" + textForEmbedding + "\"]}" ;

    //  System.out.println("summary Req:\n" + req) ;

    // curl http://127.0.0.1:3035/embeddings -H "Content-Type: application/json" -d '{"model":"Alibaba-NLP/gte-base-en-v1.5","input":["The cat sat on the mat"]}


      URL url = new URL("http://127.0.0.1:3035/embeddings") ;
      HttpURLConnection con = (HttpURLConnection)url.openConnection() ;
      con.setRequestMethod("POST") ;
      con.setRequestProperty("Content-Type", "application/json") ;
      con.setRequestProperty("Accept", "application/json") ;
      con.setDoOutput(true) ;

      OutputStream os = con.getOutputStream() ;

      byte[] buf = req.getBytes("utf-8") ;
      os.write(buf, 0, buf.length) ; 
      os.flush() ;
      os.close() ;

      try {
        if (100 <= con.getResponseCode() && con.getResponseCode() <= 399) {

          BufferedReader br = new BufferedReader(new InputStreamReader(con.getInputStream(), "utf-8")) ;
          StringBuffer resp = new StringBuffer() ;
          
          while (true) {
            String r = br.readLine() ;
            if (r == null) break ;
            resp.append(r) ;
          }
          br.close() ;

          String rs = resp.toString() ; 

          //System.out.println("summary resp:\n" + rs) ;


          // {"object":"embedding","data":[{"object":"embedding","embedding":[-0.005454093683511019,-0.0032623664010316133]...
      

          int i = rs.indexOf("\"embedding\":[") ;
          if (i < 0) throw new Exception("No embeddings in response: " + rs) ;
          int start = i + 13 ;
          i = rs.indexOf("]", start) ;
          if (i < 0) throw new Exception("No embedding end in response: " + rs) ;
          String t = rs.substring(start, i).replace(" ", "").trim() ;
          String [] ft = t.split(",") ;
          if (ft.length != 768) throw new Exception("Embedding len was " + ft.length + " in response: " + rs) ;
          float f[] = new float[768] ;
          for (int j=0;j<768;j++) f[j] = Float.parseFloat(ft[j]) ;
          return f ;
        }
        else {
          BufferedReader br = new BufferedReader(new InputStreamReader(con.getErrorStream(), "utf-8")) ;
          StringBuffer resp = new StringBuffer() ;
          
          while (true) {
            String r = br.readLine() ;
            if (r == null) break ;
            resp.append(r) ;
          }
          br.close() ;

          String rs = resp.toString() ; 

          System.out.println("err resp:\n" + rs) ;
          throw new Exception("Get embedding error: " + rs) ;

        }
      }
      catch (Exception e) {
        if (textForEmbedding.length() >= 1000) {
          System.out.println("text has too many tokens?  len: " + textForEmbedding.length() + " trying again") ;
          continue ;
        }
        System.out.println("Embedding failed text:" + textForEmbedding) ;
        throw e ;
      }
    }
    // ok, did not succeed...
    throw new Exception("Couldnt generate embedding") ;
  }     


    void normalise(final float v[]) {

      double sums = 0 ;
  
      for (int i=0;i<v.length;i++) sums += v[i] * v[i] ;
      float scale = (float) (1 / Math.sqrt(sums) ) ;
      //System.out.println("  NORM SCALE " + scale) ;
      for (int i=0;i<v.length;i++) v[i] *= scale ;    
    }  


}    

