import pdfplumber
import docx
import fitz
import spacy
import re

nlp = spacy.load("en_core_web_sm")

SKILLS = [
    "python","java","c++","c","html","css","javascript",
    "react","angular","node","flask","django",
    "sql","mysql","mongodb","aws","azure",
    "docker","git","linux","machine learning",
    "deep learning","data science","power bi",
    "excel","tableau","tensorflow","pandas","numpy"
]

EDUCATION = [
    "b.tech","btech","m.tech","mtech",
    "b.e","be","m.e","me",
    "bca","mca","b.sc","m.sc",
    "mba","phd","diploma"
]

CERTIFICATIONS = [
    "aws","azure","google","oracle",
    "coursera","udemy","nptel"
]


def extract_text(filepath):

    text = ""

    if filepath.lower().endswith(".pdf"):

        try:
            with pdfplumber.open(filepath) as pdf:
                for page in pdf.pages:
                    t = page.extract_text()
                    if t:
                        text += t + "\n"
        except:
            doc = fitz.open(filepath)
            for page in doc:
                text += page.get_text()

    elif filepath.lower().endswith(".docx"):

        doc = docx.Document(filepath)

        for para in doc.paragraphs:
            text += para.text + "\n"

    return text


def extract_email(text):

    emails = re.findall(r'[\w\.-]+@[\w\.-]+', text)

    if emails:
        return emails[0]

    return "Not Found"


def extract_phone(text):

    phones = re.findall(r'\+?\d[\d\s-]{8,15}', text)

    if phones:
        return phones[0]

    return "Not Found"


def extract_name(text):

    lines = text.split("\n")

    ignore = [
        "resume","curriculum","vitae",
        "java","python","developer",
        "engineer","software","email",
        "phone","skills","education",
        "experience"
    ]

    for line in lines[:8]:

        line = line.strip()

        if len(line.split()) >= 2:

            bad = False

            for word in ignore:

                if word in line.lower():
                    bad = True

            if not bad:
                return line.title()

    doc = nlp(text)

    for ent in doc.ents:

        if ent.label_ == "PERSON":

            if ent.text.lower() not in ignore:
                return ent.text.title()

    return "Not Found"


def extract_skills(text):

    found = []

    lower = text.lower()

    for skill in SKILLS:

        if skill in lower:
            found.append(skill.title())

    return sorted(list(set(found)))


def extract_education(text):

    found = []

    lower = text.lower()

    for edu in EDUCATION:

        if edu in lower:
            found.append(edu.upper())

    return sorted(list(set(found)))


def extract_certifications(text):

    found = []

    lower = text.lower()

    for cert in CERTIFICATIONS:

        if cert in lower:
            found.append(cert.upper())

    return sorted(list(set(found)))


def extract_experience(text):

    exp = re.findall(r'(\d+)\+?\s*years?', text.lower())

    if exp:
        return exp[0] + " Years"

    return "Fresher / Not Mentioned"


def extract_projects(text):

    projects = []

    lines = text.split("\n")

    for line in lines:

        if "project" in line.lower():

            projects.append(line.strip())

    return projects[:5]


def ats_score(skills, education):

    score = 0

    score += len(skills) * 6

    score += len(education) * 10

    if score > 100:
        score = 100

    return score


def parse_resume(filepath):

    text = extract_text(filepath)

    skills = extract_skills(text)

    education = extract_education(text)

    return {

        "Name": extract_name(text),

        "Email": extract_email(text),

        "Phone": extract_phone(text),

        "Skills": skills,

        "Education": education,

        "Experience": extract_experience(text),

        "Projects": extract_projects(text),

        "Certifications": extract_certifications(text),

        "ATS": ats_score(skills, education),

        "Resume": text
    }