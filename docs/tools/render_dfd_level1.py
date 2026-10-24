from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

OUT=Path(__file__).resolve().parents[1]/"DecoStone-DFD-Level-1.png"
S=2; W,H=1900,1380
img=Image.new("RGB",(W*S,H*S),"white"); d=ImageDraw.Draw(img)
FONT=r"C:\Windows\Fonts\arial.ttf"; BOLD=r"C:\Windows\Fonts\arialbd.ttf"
NAVY="#182338"; SLATE="#526078"; INK="#34445B"
BLUE="#EDF3FA"; BLUE_E="#425D7A"; AMBER="#FFF2DC"; AMBER_E="#A7600B"; GREEN="#EEF7F2"; GREEN_E="#32704E"
def ft(n,b=False): return ImageFont.truetype(BOLD if b else FONT,n*S)
def txt(x,y,t,n=18,b=False,c=NAVY,anchor="mm"): d.text((x*S,y*S),t,font=ft(n,b),fill=c,anchor=anchor)
def arrow(pts,width=3,head=12):
    p=[(int(x*S),int(y*S)) for x,y in pts]; d.line(p,fill=INK,width=width*S,joint="curve")
    x1,y1=p[-2]; x2,y2=p[-1]; a=math.atan2(y2-y1,x2-x1)
    q1=(x2-head*S*math.cos(a-math.pi/6),y2-head*S*math.sin(a-math.pi/6)); q2=(x2-head*S*math.cos(a+math.pi/6),y2-head*S*math.sin(a+math.pi/6))
    d.polygon([(x2,y2),q1,q2],fill=INK)
def lab(x,y,t):
    f=ft(15,True); b=d.textbbox((0,0),t,font=f); w=b[2]-b[0]; h=b[3]-b[1]; x*=S; y*=S
    d.rounded_rectangle((x-w/2-8*S,y-h/2-4*S,x+w/2+8*S,y+h/2+4*S),radius=5*S,fill="white")
    d.text((x,y),t,font=f,fill=SLATE,anchor="mm")
def entity(box,title,lines):
    x1,y1,x2,y2=box; d.rounded_rectangle((x1*S,y1*S,x2*S,y2*S),radius=16*S,fill=BLUE,outline=BLUE_E,width=4*S)
    txt((x1+x2)/2,y1+38,title,24,True)
    for i,t in enumerate(lines): txt((x1+x2)/2,y1+76+i*29,t,17,False,SLATE)
def proc(box,num,title,lines):
    x1,y1,x2,y2=box; d.ellipse((x1*S,y1*S,x2*S,y2*S),fill=AMBER,outline=AMBER_E,width=5*S); cx=(x1+x2)/2; cy=(y1+y2)/2
    txt(cx,cy-42,num,19,True,AMBER_E); txt(cx,cy-7,title,23,True)
    for i,t in enumerate(lines): txt(cx,cy+27+i*25,t,16,False,SLATE)
def store(box,code,title,detail):
    x1,y1,x2,y2=box; d.rectangle((x1*S,y1*S,x2*S,y2*S),fill=GREEN,outline=GREEN_E,width=4*S); d.rectangle((x1*S,y1*S,(x1+14)*S,y2*S),fill=GREEN_E)
    txt((x1+x2)/2+7,y1+29,code+"  "+title,19,True); txt((x1+x2)/2+7,y1+61,detail,14,False,SLATE)

txt(W/2,44,"DATA FLOW DIAGRAM — LEVEL 1",32,True)
txt(W/2,80,"DecoStone Material Management System (MMS)",18,False,SLATE)

# External entity, processes and logical data stores
entity((45,430,350,790),"SYSTEM USERS",["Admin", "Manager", "Supervisor", "Role-based access", "Supervisor: assigned godowns"])
proc((570,105,1010,275),"1.0","Authenticate User",["Verify credentials, role", "and godown assignments"])
proc((570,350,1010,520),"2.0","Manage Master Data",["Maintain godowns, categories", "and materials"])
proc((570,585,1010,755),"3.0","Process Stock Activity",["Receive, dispatch, transfer", "adjust and validate stock"])
proc((570,970,1010,1150),"4.0","View Inventory & Reports",["Balances, alerts, history", "summaries and exports"])
store((1200,105,1750,195),"D1","User Accounts","Roles and godown assignments")
store((1200,320,1750,410),"D2","Master Records","Godowns, categories, materials")
store((1200,535,1750,625),"D3","Stock Balances","Quantity by material and godown")
store((1200,750,1750,840),"D4","Transaction Records","Receipts, dispatches, transfers, adjustments")
store((1200,1155,1750,1245),"D5","Audit Log","User and operation events")

# User requests and process results
arrow([(350,475),(455,475),(455,190),(570,190)]); lab(450,345,"Login details")
arrow([(596,230),(430,230),(430,610),(350,610)]); lab(410,520,"Access result")
arrow([(350,650),(475,650),(475,430),(570,430)]); lab(470,570,"Master-data request")
arrow([(648,470),(450,470),(450,685),(350,685)]); lab(435,640,"Confirmation")
arrow([(350,725),(570,680)]); lab(455,710,"Stock operation")
arrow([(652,725),(350,755)]); lab(455,755,"Operation result")
arrow([(300,790),(390,875),(785,875),(785,970)]); lab(630,855,"Inventory / report request")
arrow([(785,1150),(785,1215),(420,1215),(420,780),(350,780)]); lab(800,1200,"Balances, alerts, movement history and reports")

# Authentication and master data
arrow([(1006,155),(1200,155)]); lab(1105,135,"Verify account")
arrow([(1200,185),(977,235)]); lab(1110,215,"Account and role data")
arrow([(1006,420),(1110,420),(1110,365),(1200,365)]); lab(1100,400,"Create / update records")
arrow([(1200,390),(1145,390),(1145,500),(930,500)]); lab(1090,480,"Read master records")

# Stock activity uses master records, balances, transaction history, and audit data
arrow([(1200,390),(1175,390),(1175,555),(1004,650)]); lab(1120,570,"Validate material and godown")
arrow([(1000,645),(1100,610),(1200,580)]); lab(1110,600,"Check current quantity")
arrow([(1200,610),(1090,675),(984,710)]); lab(1105,700,"Updated balance")
arrow([(970,720),(1100,780),(1200,795)]); lab(1100,765,"Write transaction")
arrow([(885,745),(970,835),(1080,855),(1885,855),(1885,1200),(1750,1200)]); lab(1300,850,"Record audit event")

# Reports read current master records, stock balances, and transaction history.
# Route the read flows around the right side and enter the report process at its right boundary.
arrow([(1750,350),(1790,350),(1790,985),(912,985)]); lab(1430,968,"Material and category data")
arrow([(1750,580),(1820,580),(1820,1030),(1002,1030)]); lab(1450,1015,"Current stock balances")
arrow([(1750,795),(1850,795),(1850,1080),(1005,1080)]); lab(1460,1065,"Movement history")

txt(W/2,1300,"D1–D5 are logical database stores. Stock operations are validated before balances and transaction history are updated.",15,False,SLATE)
img.resize((W,H),Image.Resampling.LANCZOS).save(OUT,dpi=(200,200))
print(OUT)
