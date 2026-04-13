import spacy
from sentence_transformers import SentenceTransformer, util
import re

from utils import keywords


def filter_by_len(
    texts, 
    min_len: int=20
): 
    t_min = [t_obj for t_obj in texts if len(t_obj['text']) >= min_len]
    return t_min

def regex_text(
    texts, 
    pattern, 
    reflag=re.NOFLAG
): 
    t_match = [t_obj for t_obj in texts if re.search(pattern, t_obj['text'], reflag)]
    # print(f"reduced to {len(t_match)/len(texts)}, returning {len(t_match)} text items")
    return t_match

def match_text(
    texts, 
    nlp, 
    model,
    query, 
    threshold=0.45            
): 
    matched_texts = []
    text_scores = []

    
    # q vector
    query_emb = model.encode_query(query, convert_to_tensor=True)
    
    for t_obj in texts: 
        doc = nlp(t_obj['text'])
        sentences = [sent.text for sent in doc.sents]
    
        # s vector
        sentence_embs = model.encode_document(sentences, convert_to_tensor=True)
    
        # cosine similarity
        scores = util.cos_sim(query_emb, sentence_embs)[0]
        max_score = max(scores)
        if max_score > threshold: 
            matched_texts.append(t_obj)
            text_scores.append(max_score)
    # print(f"returning {len(matched_texts)} text items")
    return matched_texts, text_scores


def main(
        document, 
        nlp=None, 
        model=None, 
        min_len: int=0, 
        patterns = keywords.QUALITATIVE_PATTERNS, 
        reflag=re.NOFLAG,  
        threshold=0.45
    ): 
    texts = document['texts']

    res = {}
    res['extraction info'] = {}
    res['extraction info']['total texts'] = len(texts)
    if min_len: 
        texts = filter_by_len(texts, min_len)
        res['extraction info']["after len filter"] = len(texts)
    
    # print(pattern) 
    for k, v in patterns.items(): 
        text = texts
        res[k] = {}
        res[k]['extraction_info'] = {}
        patterns = v['patterns']
        queries = v['queries']
        if patterns: 
            text = regex_text(text, patterns, reflag)
            res[k]['extraction_info']['after regex'] = len(text) 
        if queries and model and nlp: 
            text, scores = match_text(text, nlp, model, queries, threshold)
            res[k]["extraction_info"]['after queries'] = len(texts)
            scores, text = zip(*sorted(zip(scores, text), reverse=True))
            res[k][scores] = scores
        res[k]['self_ref'] = [t['self_ref'] for t in text]
        res[k]['texts'] = [t['text'] for t in text]
    
    return res