import re
import pdfplumber
import spacy

nlp = spacy.load("en_core_web_sm")

# Large Skills Dataset
SKILLS = [
    "Python","Java","C","C++","JavaScript",
    "HTML","CSS","React","Node.js",
    "SQL","MySQL","MongoDB",
    "Machine Learning","Deep Learning",
    "Artificial Intelligence",
    "Data Science","NLP",
    "TensorFlow","PyTorch",
    "Flask","Django",
    "AWS","Azure","Docker",
    "Git","Linux","Power BI",
    "Tableau","Excel"
]

DEGREES = [
    "B.Tech","B.E","M.Tech","MBA",
    "MCA","BCA","B.Sc","M.Sc",
    "PhD","Bachelor","Master"
]


class ResumeParser:

    def extract_text(self,file):

        text=""

        with pdfplumber.open(file) as pdf:

            for page in pdf.pages:

                page_text=page.extract_text()

                if page_text:
                    text+=page_text

        return text


    def extract_email(self,text):

        email=re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",text)

        return email[0] if email else ""


    def extract_phone(self,text):

        phone=re.findall(r"\+?\d[\d\s()-]{8,}\d",text)

        return phone[0] if phone else ""


    def extract_name(self,text):

        doc=nlp(text)

        for ent in doc.ents:

            if ent.label_=="PERSON":
                return ent.text

        return ""


    def extract_skills(self,text):

        found=[]

        for skill in SKILLS:

            if skill.lower() in text.lower():

                found.append(skill)

        return list(set(found))


    def extract_degree(self,text):

        degree=[]

        for d in DEGREES:

            if d.lower() in text.lower():

                degree.append(d)

        return degree


    def extract_experience(self,text):

        years=re.findall(r'(\d+)\+?\s+years?',text,re.I)

        return years


    def extract_projects(self,text):

        pattern=r'Projects(.*?)(Education|Experience|Skills|Certifications|$)'

        match=re.search(pattern,text,re.S|re.I)

        return match.group(1).strip() if match else ""


    def extract_certifications(self,text):

        certs=[]

        keywords=["AWS","Azure","Google","Oracle","Cisco","Microsoft"]

        for c in keywords:

            if c.lower() in text.lower():

                certs.append(c)

        return certs


    def extract_languages(self,text):

        langs=[]

        all_langs=["English","Hindi","French","German","Spanish"]

        for l in all_langs:

            if l.lower() in text.lower():

                langs.append(l)

        return langs


    def parse(self,file):

        text=self.extract_text(file)

        return{

            "Name":self.extract_name(text),

            "Email":self.extract_email(text),

            "Phone":self.extract_phone(text),

            "Degree":self.extract_degree(text),

            "Skills":self.extract_skills(text),

            "Experience":self.extract_experience(text),

            "Projects":self.extract_projects(text),

            "Certifications":self.extract_certifications(text),

            "Languages":self.extract_languages(text)

        }

class CandidateScorer:

    def calculate_score(self,data):

        score=0

        score+=len(data["Skills"])*5

        score+=len(data["Degree"])*10

        score+=len(data["Certifications"])*5

        score+=len(data["Experience"])*8

        if data["Projects"]!="":

            score+=15

        if score>100:

            score=100

        return score
               import sqlite3

conn=sqlite3.connect("resume.db")

cursor=conn.cursor()

cursor.execute("""

CREATE TABLE IF NOT EXISTS candidates(

name TEXT,

email TEXT,

phone TEXT,

degree TEXT,

skills TEXT,

experience TEXT,

score INTEGER

)

""")

conn.commit()


def save(data,score):

    cursor.execute("""

INSERT INTO candidates VALUES(?,?,?,?,?,?,?)

""",

(

data["Name"],

data["Email"],

data["Phone"],

",".join(data["Degree"]),

",".join(data["Skills"]),

",".join(data["Experience"]),

score

))

conn.commit()
import streamlit as st

from parser import ResumeParser

from scorer import CandidateScorer

from database import save

parser=ResumeParser()

scorer=CandidateScorer()

st.title("AI Resume Parser")

file=st.file_uploader("Upload Resume",type=["pdf"])

if file:

    data=parser.parse(file)

    score=scorer.calculate_score(data)

    save(data,score)

    st.success("Resume Parsed Successfully")

    st.json(data)

    st.metric("Candidate Score",score)