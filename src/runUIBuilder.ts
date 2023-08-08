//@ts-nocheck
import { bitable, FieldType } from "@base-open/web-api";
import QRCode from "qrcode";
window.bitable = bitable;
window.FieldType = FieldType;
let loading = false;
export default async function main(ui: any, t = (s: string) => s) {
  ui.markdown(`
   ${t("title.desc")}
  `);
  ui.form(
    (form: any) => ({
      formItems: [
        form.tableSelect("tableId", {
          label: t("select.table"),
          placeholder: t("select.table.placeholder"),
        }),
        form.fieldSelect("bankCode", {
          label: t("bank.code"),
          placeholder: t("bank.code"),
          sourceTable: "tableId",
          filterByTypes: [FieldType.Text],
        }),
        form.fieldSelect("accountName", {
          label: t("account.name"),
          placeholder: t("account.name"),
          sourceTable: "tableId",
          filterByTypes: [FieldType.Text],
        }),
        form.fieldSelect("accountNumber", {
          label: t("account.number"),
          placeholder: t("account.number"),
          sourceTable: "tableId",
          filterByTypes: [FieldType.Text],
        }),
        form.fieldSelect("amount", {
          label: t("amount"),
          placeholder: t("amount"),
          sourceTable: "tableId",
          filterByTypes: [FieldType.Number],
        }),
        form.fieldSelect("memo", {
          label: t("memo"),
          placeholder: t("memo"),
          sourceTable: "tableId",
          filterByTypes: [FieldType.Text],
        }),
        form.fieldSelect("qrcodeType", {
          label: t("qrcode.type"),
          placeholder: t("qrcode.type"),
          sourceTable: "tableId",
          filterByTypes: [FieldType.SingleSelect],
          defaultValue: "QRcode Only",
        }),
        form.fieldSelect("showBankLogo", {
          label: t("show.bank.logo"),
          placeholder: t("show.bank.logo"),
          sourceTable: "tableId",
          filterByTypes: [FieldType.Checkbox],
          defaultValue: true,
        }),
        form.fieldSelect("maskAccountNumber", {
          label: t("mask.account.number"),
          placeholder: t("mask.account.number"),
          sourceTable: "tableId",
          filterByTypes: [FieldType.Checkbox],
          defaultValue: true,
        }),
        form.fieldSelect("qrcodeUrl", {
          label: "QRCode Url",
          placeholder: "QRCode Url",
          sourceTable: "tableId",
          filterByTypes: [FieldType.Url],
        }),
        form.fieldSelect("attachmentFieldId", {
          label: t("select.att"),
          placeholder: t("select.att.placeholder"),
          sourceTable: "tableId",
          filterByTypes: [FieldType.Attachment],
        }),
      ],
      buttons: [t("ok")],
    }),
    async ({ values }: any) => {
      const {
        tableId,
        bankCode,
        accountName,
        accountNumber,
        amount,
        memo,
        qrcodeType,
        showBankLogo,
        maskAccountNumber,
        qrcodeUrl,
        attachmentFieldId,
      } = values;

      const data = {
        bankCode,
        accountName,
        accountNumber,
        amount,
        memo,
        qrcodeType,
        showBankLogo,
        maskAccountNumber,
      };

      if (
        !tableId ||
        !bankCode ||
        !accountName ||
        !accountNumber ||
        !amount ||
        !memo ||
        !qrcodeType ||
        !showBankLogo ||
        !maskAccountNumber ||
        !attachmentFieldId
      ) {
        ui.message.error(t("error.empty"));
      }

      const table = await bitable.base.getTableById(tableId);
      const field = await table.getFieldById(bankCode);
      const valueList = await field.getFieldValueList();
      const records = valueList.map(({ record_id }) => record_id);

      ui.showLoading(" ");
      const checkValidObjectData = (object) => {
        for (let field in object) {
          if (!object[field].length) return false;
        }

        return true;
      };

      for (let i = 0; i < records.length; i++) {
        const tempData = {};

        for (let field in data) {
          if (!data[field]) break;

          tempData[field] = await table.getCellString(data[field], records[i]);
        }

        if (checkValidObjectData(tempData)) {
          tempData.accountName = tempData.accountName.replace(/ /g, "+");
          tempData.amount = +tempData.amount;
          tempData.memo = tempData.memo.replace(/ /g, "+");
          tempData.qrcodeType =
            tempData.qrcodeType === "QRcode Only" ? "2" : "1";
          tempData.showBankLogo = tempData.showBankLogo === "true" ? "1" : "0";
          tempData.maskAccountNumber =
            tempData.maskAccountNumber === "true" ? "1" : "0";

          const backgroundRandomNumber = Math.floor(Math.random() * 101);

          const vietQRCoUrl = `https://vietqr.co/api/generate/${tempData.bankCode}/${tempData.accountNumber}/${tempData.accountName}/${tempData.amount}/${tempData.memo}?style=${tempData.qrcodeType}&logo=${tempData.showBankLogo}&isMask=${tempData.maskAccountNumber}&bg=${backgroundRandomNumber}`;
          await table.setCellValue(qrcodeUrl, records[i], [
            {
              type: "url",
              link: vietQRCoUrl,
            },
          ]);

          const response = await fetch(vietQRCoUrl);
          const qrcodeBlob = await response.blob();
          const size = qrcodeBlob.size;
          const type = qrcodeBlob.type;
          const fileName = "qrcode.png";
          const qrcodeFile = new File([qrcodeBlob], fileName, {
            type: qrcodeBlob.type,
          });

          const tokens = await bitable.base.batchUploadFile([
            qrcodeFile,
          ] as any);
          const attachments = [
            {
              name: fileName,
              size,
              type,
              token: tokens[0],
              timeStamp: Date.now(),
            },
          ];
          await table.setCellValue(attachmentFieldId, records[i], attachments);
        }
      }

      ui.hideLoading();
      ui.message.success(t("success"));
    }
  );
}
