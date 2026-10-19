# RICE DOCTOR: สถานะการฝึก 14 โรค

## สถานะล่าสุด — 19 ตุลาคม 2026

เว็บใช้ MobileNetV2 + MLP แบบ multi-label 17 outputs ครอบคลุม 13/14 โรคตามคู่มือ ขาดโรคหูด (Rice gall dwarf). ฝึกจาก Roboflow Raw Dataset v1, IoT-RiceMobileNet และ Philippines Rice Diseases (Kaggle). สิทธิ์ตามที่ผู้เผยแพร่ระบุคือ CC BY 4.0, CC BY 4.0 และ AGPL-3.0 ตามลำดับ; ยังไม่ได้ตรวจสิทธิ์ภาพต้นฉบับทุกภาพเป็นรายภาพ

หลังยุบ SHA256 ซ้ำมี 5,539 ภาพ แบ่ง train/validation/test 3,864/835/840 ภาพ โดยเก็บกลุ่มภาพคล้ายจาก pHash ไว้ใน split เดียวกัน ไม่มี SHA256 หรือกลุ่ม pHash ข้าม split. ยังไม่ใช่การแยกตามแปลง/ต้นข้าว และอาจเหลือภาพครอปที่ตรวจซ้ำไม่พบ

ผล holdout: macro-F1 17 outputs 88.15%; macro-F1 13 โรคเป้าหมาย 88.12%; micro-F1 81.84%; top-1 อยู่ในป้ายจริง 83.57%; ตรงทั้งชุดป้าย 69.76%. **ไม่ใช่ผลทดสอบอิสระจากแปลงไทย และไม่ยืนยัน 80% ทุกโรค**. โรคไหม้ F1 74.4%, กาบใบเน่า 74.1%; คลาสหายากบางคลาสมี test เพียง 8–15 ภาพ

โมเดลปัจจุบันอยู่ที่ `models/rice-grouped-17class/` อ่านรายละเอียด สิทธิ์ ผลรายคลาส และการตรวจ export ใน `MODEL_CARD.md`, `evaluation.json`, `verification.json`, `coverage.csv`. หน้าเว็บโหลด `model-data.js` และใช้ ONNX Runtime Web/WASM จาก CDN; ภาพประมวลผลในเบราว์เซอร์

## งานที่เหลือ

- หาภาพโรคหูดที่ติดป้ายถูกต้อง มีสิทธิ์ และจำนวน/ความหลากหลายพอสำหรับแบ่ง train/validation/test
- เพิ่มภาพโรคที่ยังอ่อนและทดสอบจากแปลงไทยที่ไม่อยู่ในการฝึก
- [งานวิจัย RGDV ปี 2022](https://www.frontiersin.org/journals/microbiology/articles/10.3389/fmicb.2022.834712/full) เป็น CC BY และมีภาพประกอบการติดเชื้อเดี่ยว/ร่วม แต่ไม่ใช่ชุดภาพฝึกจำนวนเพียงพอ จึงยังไม่นับเป็นคลาส AI

## บันทึกรุ่นก่อน — ไม่ใช่สถานะโมเดลปัจจุบัน

# RICE DOCTOR: สถานะการหาและฝึกโมเดล 14 โรค

อัปเดต 18 ตุลาคม 2026

## สถานะปัจจุบัน

- เว็บอัปเดตเป็น MobileNetV2 8 output labels จาก Roboflow Raw Dataset v1 และ IoT-RiceMobileNet แล้ว. ชุดทดสอบ holdout 390 ภาพได้ macro-F1 85.7%, micro-F1 83.1%, top-1 label อยู่ในป้ายจริง 84.9%, exact label-set accuracy 71.5%. ค่าเหล่านี้เป็นผลทดสอบภายในจากแหล่งข้อมูลเดียวกับที่ใช้ฝึก ไม่ใช่ผลทดสอบไทยหรือความแม่นยำในแปลง. รายละเอียดและจำนวนรายคลาสอยู่ใน `models/rice-multisource-8class/MODEL_CARD.md` และ `evaluation.json`.
- ในโฟลเดอร์มีโมเดล TFLite 8 คลาสจาก ChashiBhAI ซึ่งระบุ MIT และได้รับการตรวจว่าผล export ตรงกับ `.pt` บนชุด holdout ของผู้จัดทำ แต่หน้านี้ไม่มีตัวเลข accuracy จากชุดทดสอบอิสระ โมเดลครอบคลุมโรคในคู่มือ 5/14 รายการ (ขอบใบแห้ง, กาบใบแห้ง, ใบไหม้, ใบขีดสีน้ำตาล, ใบจุดสีน้ำตาล) จึงยังไม่ใช่โมเดลครบ 14 โรคและยังไม่ผ่านการทดสอบไทย. เว็บยังไม่ได้ใช้โมเดล 8 คลาสนี้.
- ยังไม่มีโมเดลที่ RICE DOCTOR ฝึกและตรวจสอบแล้วว่าจำแนกครบทั้ง 14 โรคได้อย่างน้อย 80%. โมเดลใหม่ครอบคลุมโรคในคู่มือได้เพียง 5/14 รายการ; อีก 3 output เป็น leaf scald (คนละโรคกับใบขีดโปร่งแสง), ใบปกติ และคราบ/สารตกค้าง (ไม่ใช่โรค).
- พบโมเดล EfficientNet-B0 สาธารณะ 17 คลาสที่ระบุสัญญาอนุญาตน้ำหนัก Apache-2.0 ผู้พัฒนารายงาน accuracy 97.09% และ macro-F1 94.73% จาก test set 3,984 ภาพ แต่ไม่ได้ประเมินกับภาพไทย คลาสหายากบางชนิดมี test support เพียง 15 ภาพ และผู้พัฒนาเตือนว่าภาพพื้นหลังควบคุมกับภาพภาคสนามปะปนกัน ตัวเลขนี้จึงห้ามนำไปแสดงเป็นความแม่นยำของ RICE DOCTOR หรือความแม่นยำในประเทศไทย.
- ประเมิน EfficientNet-B0 17 คลาสกับภาพ Kaggle ที่ยุบ SHA-256 ซ้ำเหลือ 1,946 ภาพแล้ว ได้ top-1 accuracy 79.4% และ macro-F1 79.8% สำหรับ 14 คลาสในชุด Kaggle (13 โรค + ภาพปกติ). ใน 12 โรคที่ตรงคู่มือไทย macro-F1 82.2%; ไม่ใช่ครบ 14 โรค. ยังตัดความเป็นไปได้ว่าภาพบางส่วนเคยอยู่ในข้อมูลฝึกของผู้จัดทำโมเดลไม่ได้ จึงไม่อ้างว่าเป็น held-out อิสระ และยังไม่เปลี่ยนโมเดลในเว็บ. ผลละเอียดอยู่ใน work/rice-kaggle/evaluation-efficientnet17.json. สภาพแวดล้อมแพ็กเกจใหม่ work/pydeps ใช้งานได้แล้ว.
- โมเดล 17 คลาสตรงกับโรคในคู่มือ 12/14 รายการ ขาดโรคเมล็ดด่างและโรคหูด (Rice Gall Dwarf). มีคลาสอื่นที่ไม่ใช่โรคเป้าหมาย เช่น Healthy และ Hispa.
- ดาวน์โหลดชุดภาพ Philippines Rice Diseases จาก Kaggle แล้ว: 2,935 ไฟล์, 49.04 MB, 13 โรค + ภาพปกติ และหน้า Kaggle ระบุ AGPL-3.0. ตรวจพบภาพ SHA-256 ไม่ซ้ำ 1,946 ภาพ, กลุ่มไฟล์ซ้ำตรงกัน 989 กลุ่ม (985 กลุ่มซ้ำข้ามโฟลเดอร์) และคู่ภาพใกล้เคียงตาม perceptual hash 361 คู่. โรคในชุดตรงกับคู่มือ 12/14 รายการ (ขาดเมล็ดด่างและโรคหูด; มี stem rot เพิ่ม). ชุดนี้พร้อมสำหรับการประเมิน/ฝึกเชิงวิจัยโดยต้องคงเครดิตและพิจารณาเงื่อนไข AGPL-3.0.
- พบชุดภาพ 6,758 ภาพ 10 คลาสที่หน้า Mendeley Data ระบุ CC BY 4.0 ครอบคลุมโรคจากคู่มือ 6 รายการ: ขอบใบแห้ง, กาบใบแห้ง, ใบไหม้, ใบสีส้ม/ทังโกร, ใบขีดสีน้ำตาล และใบจุดสีน้ำตาล. คลาสอื่นในชุดคือ Hispa, leaf scald, neck blast และ healthy; ไม่ควรนับ leaf scald หรือ neck blast เป็นโรคเป้าหมายเพิ่มซ้ำจากรายการในคู่มือ. มีข้อมูลผู้จัดทำ/ใบอนุญาตชัดเจน แต่ยังไม่ได้ดาวน์โหลดและตรวจภาพรายไฟล์.
- พบชุดภาพเวียดนามบน Hugging Face ที่ระบุ Apache-2.0 จำนวน 37,978 ภาพ, 21 คลาส, รวม 14.7 GB. คำอธิบายของผู้จัดทำระบุว่ารวบรวมภาพจากหลายแหล่งบนอินเทอร์เน็ตและมาจากเวียดนาม. คลาสเป้าหมายตรงกับคู่มือ 8/14 รายการ ได้แก่ ขอบใบแห้ง, ใบจุดสีน้ำตาล, ใบขีดสีน้ำตาล, กาบใบแห้ง, ใบไหม้, ถอดฝักดาบ, ดอกกระถิน และทังโกร; ไม่รวม leaf scald เพราะเป็นคนละโรคกับใบขีดโปร่งแสง. คลาสถอดฝักดาบและดอกกระถินมีภาพเพียง 100 ภาพต่อคลาส. ใบอนุญาตที่หน้า dataset ระบุเป็น Apache-2.0 แต่ที่มาจากหลายเว็บไซต์ยังไม่ได้ตรวจสิทธิ์รายภาพ. การดาวน์โหลดไฟล์ Parquet ขนาด 510 MB จากหน้าเว็บหมดเวลาและไม่มีไฟล์ลงเครื่อง จึงยังไม่ได้นำมาฝึก.
- พบชุด Roboflow ของผู้ใช้ `pimolphan` ที่ระบุ CC BY 4.0 มี 10 คลาสและรุ่น v4 จำนวน 3,836 ภาพ; คลาสโรคตรงกับคู่มือ 9/14 รายการ. หน้า Download Dataset พาไปหน้าให้ลงชื่อเข้าใช้ จึงยังดึงชุดภาพไม่ได้.
- ดาวน์โหลด Roboflow Universe `Raw Dataset` v1 สำเร็จหลังผู้ใช้อนุมัติยอมรับ Terms of Service และ Privacy Policy ของบัญชี `Mau` และยอมรับตามนั้น. ZIP มี 2,993 ภาพ, splits 2,395/300/298 และ 7 segmentation classes; license ระบุ CC BY 4.0. รวม annotation ต่อภาพให้เป็น multi-label target แล้วรวมภาพ IoT-RiceMobileNet โดยลบภาพซ้ำด้วย SHA-256 ก่อนใช้.
- ชุด Mendeley CC BY 4.0 ขนาด 1.92 GB: พยายามดาวน์โหลดทั้ง zip และไฟล์ตัวอย่างผ่านเบราว์เซอร์แล้วหมดเวลา ยังไม่มีไฟล์นำเข้าฝึก.
- ชุด GD-RGBMS-DB บน Zenodo มีไฟล์ 981.7 MB สำหรับ segmentation โรคเมล็ดด่างจากภาพ RGB/หลายช่วงคลื่นมุมสูง แต่หน้า record ไม่ระบุ license จึงไม่นำมาใช้ฝึกจนกว่าจะยืนยันสิทธิ์ได้ และภาพมุมสูงไม่ตรงกับงานจำแนกภาพใบเดี่ยว.
- พบข้อมูลสำรวจโรคและแมลงในแปลงนาของกรมการข้าวที่เปิดภายใต้ Open Data Common เป็นไฟล์ XLSX แต่เป็นข้อมูลสำรวจ ไม่ใช่คลังภาพที่ติดป้ายโรค จึงใช้ประกอบบริบทไทยได้แต่ใช้ฝึกตัวจำแนกภาพไม่ได้.
- สำหรับโรคหูด พบภาพตัวอย่างจาก IRRI Flickr หนึ่งรายการ; โปรไฟล์ IRRI ระบุว่าโดยทั่วไปภาพในคลังใช้ CC BY-NC-SA 4.0 เว้นแต่หน้าภาพระบุอย่างอื่น. เป็นแหล่งตรวจอาการและตัวอย่างที่ต้องใส่เครดิต/ทำตาม share-alike หากนำไปใช้ต่อ แต่ภาพเดียวไม่พอประเมินความแม่นยำของคลาส.


## โมเดลที่ฝึกจาก Roboflow + IoT-RiceMobileNet (18 ต.ค. 2026)

- โมเดล: `models/rice-multisource-8class/model.onnx` และ `model-data.js`; เว็บแสดงผลแบบ multi-label sigmoid.
- จำนวนภาพ unique หลังตัดซ้ำ: train 2,801, validation 402, test 390. Roboflow splits ใช้ตามที่ชุดข้อมูลให้; ภาพ IoT แบ่ง stratified 70/15/15 ด้วย seed คงที่.
- ป้าย 8 output: bacterial leaf blight, brown spot, grain discoloration, leaf blast, leaf scald, narrow brown spot, pesticide residue, healthy.
- ผลชุดทดสอบ: macro-F1 85.7%, micro-F1 83.1%, top-1 อยู่ในป้ายจริง 84.9%, exact label-set accuracy 71.5%. ผลรายคลาสใน test: BLB F1 83.0% (n=112), brown spot 77.5% (n=58), grain discoloration 95.8% (n=34), leaf blast 80.2% (n=98), leaf scald 84.7% (n=56), narrow brown spot 80.7% (n=65), pesticide residue 96.6% (n=15), healthy 87.5% (n=15). คลาสตัวอย่างจำนวนน้อยมีค่าผันผวน.
- วิธีฝึก: MobileNetV2 pretrained backbone แช่แข็งและฝึก multilabel classification head, sigmoid BCE, เลือก threshold จาก validation.
- ข้อจำกัด: ทั้ง test ยังมาจากสองแหล่งเดียวกับ train (แม้แยกภาพตาม split); ไม่ใช่การประเมิน external/site split และไม่ยืนยันผลในไทย. Segmentation annotations หลายคลาสในภาพเดียวถูก union เป็น image-level labels. ใบขีดโปร่งแสง, กาบใบแห้ง, กาบใบเน่า, เขียวเตี้ย, ดอกกระถิน, ถอดฝักดาบ, ทังโกร, ใบหงิก/จู๋ และโรคหูด ยังไม่มีคลาสที่ผ่านการฝึก/ประเมินในโมเดลนี้. เมล็ดด่างมีคลาสภาพ แต่ภาพใบอย่างเดียวอาจวินิจฉัยไม่ได้; output ของโมเดลจึงควรใช้เป็นสัญญาณให้ตรวจรวง/เมล็ด.
- การแสดงผลในเว็บ: คะแนน sigmoid เป็นคะแนนโมเดล ไม่ใช่ calibrated probability; UI บอกชัดว่าไม่รับประกันและยังไม่ประเมินกับแปลงไทย. คำแนะนำด้านโรคยังเรียบเรียงแยกจากองค์ความรู้กรมการข้าว.

## ตารางความครอบคลุมที่พบ

| โรคในคู่มือ | โมเดลสาธารณะ 17 คลาส | ชุดภาพ Mendeley CC BY 4.0 |
|---|---|---|
| กาบใบเน่า (Sheath rot) | มี | ไม่มี |
| กาบใบแห้ง (Sheath blight) | มี | มี |
| ขอบใบแห้ง (Bacterial leaf blight) | มี | มี |
| เขียวเตี้ย (Grassy stunt) | มี | ไม่มี |
| ดอกกระถิน (False smut) | มี | ไม่มี |
| ถอดฝักดาบ (Bakanae) | มี | ไม่มี |
| ใบขีดโปร่งแสง (Bacterial leaf streak) | มี | ไม่มี |
| ใบขีดสีน้ำตาล (Narrow brown spot) | มี | มี |
| ใบจุดสีน้ำตาล (Brown spot) | มี | มี |
| ใบสีส้ม/ทังโกร (Tungro) | มี | มี |
| ใบหงิก/จู๋ (Ragged stunt) | มี | ไม่มี |
| เมล็ดด่าง (Grain discoloration) | ไม่มี | ไม่มี |
| หูด (Gall dwarf) | ไม่มี | ไม่มี |
| ไหม้ (Leaf blast) | มี | มี |

## สิ่งที่ต้องทำก่อนติดตั้งโมเดล 14 โรค

1. ต้องหาภาพที่ได้รับอนุญาตและติดป้ายโดยผู้รู้สำหรับเมล็ดด่างและโรคหูด โดยเฉพาะโรคหูดซึ่งอาการต้น/กาบ/ใบและแมลงพาหะมีความสำคัญ ภาพใบเดี่ยวอาจแยกจากโรคใบหงิกได้ยาก.
2. ดาวน์โหลดชุดภาพที่มี CC BY 4.0 แล้วตรวจไฟล์ เส้นทางต้นทาง ป้ายกำกับ ภาพซ้ำ/ภาพ augment และสัดส่วนภาพภาคสนาม ก่อนนำไปฝึกหรือรวมกับชุดเดิม.
3. ฝึก/ปรับจูนโมเดลและแยกชุดทดสอบแบบไม่ให้ภาพซ้ำหรือภาพจากต้นเดียวกันข้ามชุด หากต้องการอ้างว่าใช้ได้ในไทย ต้องมีชุดทดสอบอิสระจากแปลงไทยที่ผู้ใช้ยินยอมให้ใช้.
4. รายงาน accuracy, macro-F1 และ recall รายโรคแยกกัน ค่า 80% ใน random holdout ไม่ได้แปลว่าแม่น 80% เมื่อใช้กับแปลงไทย.

## แหล่งอ้างอิง

- [EfficientNet-B0 rice classifier, model card and Apache-2.0 weights](https://huggingface.co/Huyt/rice-leaf-disease-efficientnet-b0)
- [ChashiBhAI Rice Disease Classifier, 8 classes, MIT model license](https://huggingface.co/Shaq2/chashibhai-rice-disease-cls)
- [Philippines Rice Diseases dataset on Kaggle (AGPL-3.0)](https://www.kaggle.com/datasets/shrupyag001/philippines-rice-diseases)
- [GTS mirror listing (dataset download requires contact details)](https://gts.ai/dataset-download/philippines-rice-disease-image-dataset/)
- [Rice Leaf Disease Image Dataset, Mendeley Data, CC BY 4.0](https://data.mendeley.com/datasets/n8jpkpfz5p/1)
- [Vietnamese Rice Disease & Crop Recommendation Dataset, Hugging Face (ผู้จัดทำระบุ Apache-2.0)](https://huggingface.co/datasets/minhhungg/rice-disease-dataset)
- [Rice Disease Classification Model by pimolphan, Roboflow Universe (CC BY 4.0; dataset version v4 มี 3,836 ภาพ)](https://universe.roboflow.com/pimolphan/rice-disease-vahwz/dataset/4)
- [Raw Dataset by Rice Diseases, Roboflow Universe (CC BY 4.0; 2,993 segmentation images)](https://universe.roboflow.com/rice-diseases-3bosa/raw-dataset-mo0hq)
- [GD-RGBMS-DB: Rice Grain Discoloration Segmentation, Zenodo (ไม่มี license แสดงบน record)](https://zenodo.org/records/17008818)
- [IRRI Photos license statement on Flickr (CC BY-NC-SA 4.0 unless otherwise stated)](https://www.flickr.com/people/ricephotos/)
- [IRRI example image and description for Gall Dwarf](https://www.flickr.com/photos/ricephotos/11923139625)
- [กรมการข้าว: สำรวจการเกิดโรคและแมลงศัตรูในแปลงนาเกษตรกร (Open Data Common; XLSX)](https://catalog.ricethailand.go.th/th/dataset/rdservey_11_01)
- [BanglaRiceLeaf field image dataset paper and Harvard Dataverse access](https://pmc.ncbi.nlm.nih.gov/articles/PMC13351439/) (5 classes only; Bangladesh, not Thailand)
- [กรมการข้าว: Rice Knowledge Bank](https://rkb.ricethailand.go.th/web/index.php) (Thai disease information, not a complete labeled image dataset)

ภาพจากเว็บหรือภาพที่ค้นเจอใน Google ไม่ได้แปลว่าอนุญาตให้เอาไปฝึก AI อัตโนมัติ รายงานนี้จึงแยกการเปิดดูข้อมูลสาธารณะออกจากการนำภาพมาใช้ฝึก และยังไม่กล่าวอ้างว่าภาพจากประเทศไทยพร้อมใช้งาน.
