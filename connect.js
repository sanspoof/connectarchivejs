// const { json } = require("stream/consumers");

const CONNECT = (function (core) {
    'use strict'

    const strManageItem = "connectmanageitem";
    const strCmdSel = '[data-cmd]';
    const strConnectSwiper = "connectswiper"
    const connectSwiperSlide = "connectswiperslide";
    const connectitem = "connectitem";
    const strCoreSubnavModifier = "coresubnav--spacebetween";
    const strConnectItem = "[data-pecsid]";
    let arrCurrentPageItems;
    let boolImportingMultipleItems;
    let objMediaData;


    const elSelectManage = document.querySelector('#ddManage');
    const elManageOutput = document.querySelector('#manageOutput');
    const template = document.querySelector('#connectManageItem');
    const rbMediaType = _s('mediatype');
    const elCoreSubnav = document.querySelector('.coresubnav');
    const elConnectHomepageBtn = document.querySelector('#btnConnectHomepage');

    let pprConnectItemFurtherInfo, pprImportList, modalCreateContent, modalPecsImport, modalManageModal, modalArchiveRequest, intPageIndex;
    let elManageModalPagination, boolVLEMode;
    let modalAddItem, frmMain, chkCreatePL, modalEditDetails, ufEditDetails;
    let pgrManage, elUploadFormContainer, elUploadFormWrapper, elUploadFormOptions;
    let objCurrentPECSItem, arrImportList, elImportList, elNoImportItems, objPECSHomepageData, objCurrentFilters, objItemsPendingApproval, objItemsAwaitingDownload, objActiveSeriesLinks, objApproved;

    function funcInit() {

        console.log('[CONNECT] Init');

        intPageIndex = 0;

        boolVLEMode = core.GetQS('inlinemode') != null;

        core.ElementFromHTML('Q:#connectLoader').append('#ConnectRecentItems');

        pprConnectItemFurtherInfo = new PesPop('pprConnectItemFurtherInfo', {
            popperOpts: {
                placement: 'left'
            }
        });

        pprImportList = new PesPop('pprImportList', {
            popperOpts: {
                placement: 'bottom-start'
            }
        });

        elManageModalPagination = document.querySelector('#managePagination');

        elImportList = _s('importlist');

        elNoImportItems = _s('no-importlist-items');

        modalCreateContent = new Modal('modalPecsImport', {
            contentHeight: 0.75
        });

        modalManageModal = new Modal('modalManageModal', { 
            contentHeight: 0.8,
            ShowSlimModal: true 
        });

        modalEditDetails = new Modal('modalEditDetails', {
            contentHeight: 0.8
        });

        modalArchiveRequest = new Modal('modalArchiveRequest', { ShowSlimModal: true });

        core.CL(strCmdSel, funcCommand);

        modalAddItem = new Modal('modalAddItem', {
            contentHeight: 0.8
        });

        elSelectManage.addEventListener('change', function () {
            intPageIndex = 0;
        });

        elSelectManage.addEventListener('change', funcManageSelectChange);

        elUploadFormContainer = _s('uploadformcontainer');

        elUploadFormOptions = _s('uploadformoptions');

        elUploadFormWrapper = _s('uploadformwrapper');

        // if connect not searching

        chkCreatePL = _s('createpl');

        OBS.Add(_s('connectpage'));

        let strF = core.GetQS('f');

        if (!strF) {

            //No search filters, so render home page

            console.log('[CONNECT] Render Homepage assets');

            funcLoadConnectItems().then((r) => {

                console.log('[CONNECT] Homepage data loaded');

                objPECSHomepageData = r;

                funcSetupConnectHomepageItems(objPECSHomepageData);

                funcSetupConnectBanner(objPECSHomepageData);

                elConnectHomepageBtn.style.display = "none";

                elCoreSubnav.classList.remove(strCoreSubnavModifier);

            }).catch((r) => {

                console.error('[CONNECT] Homepage data error', r);

            });

        } else {

            funcSetSearchMode();

            objCurrentFilters = JSON.parse(decodeURIComponent(strF));

            console.log('[CONNECT] [TAS] Filters', objCurrentFilters, strF);

            objCurrentFilters.sts = $('#hdn_TimeStamp').val();

            TASF.SetSearchFilters(objCurrentFilters);

            TAS.Search();

        }

        funcRenderImportList();

    }

    function funcCommand() {

        console.log('[CONNECT] Command ' + this.dataset.cmd);

        switch (this.dataset.cmd) {

            case 'open-import-list':

                pprImportList.updateRef(this);

                pprImportList.open();

                break;

            case 'further-info':

                funcConnectItemInfo(this);

                break;

            case 'import-to-pes':

                funcAddItemFromHomepage.call(this);

                break;

            case 'add-to-importlist':

                funcAddItemToImportList.call(this);

                break;

            case 'remove-from-importlist':

                funcRemoveItemFromImportList.call(this);

                break;

            case 'clear-list':

                if (confirm("Are you sure you want to clear the list?") == false) return;

                funcClearAllFromImportList.call(this);

                break;

            case 'delete-item':

                const parent3 = this.closest('[data-pecsid]');

                let deletePecsId = parent3.dataset.pecsid.split('-')[0];

                let deleteCdid = parent3.dataset.pecsid.split('-')[1];

                funcApproveRequest(deletePecsId, deleteCdid, 0, parent3);

                break;

            case 'open-quickview':

                QV.Open(this.dataset.encid).then(function () {

                }).catch(function (r) {

                    console.log(r);

                });

                break;

            case 'addto-library':

                funcGetSingleItem();

                funcAddItemToLibrary(this.dataset.pecsid, this.dataset.pageindex, undefined, this.dataset.incollection == 'true');

                break;

            case 'manage-requests':

                modalManageModal.open();

                break;

            case 'import-all':

                funcGetAllItems();
                //AddMultipleItems webmethod?

                break;

            case 'open-archive-request-modal':

                modalArchiveRequest.open();

                break;

            case 'confirm-addtolibrary':

                funcConfirmAddToLibrary();

                break;

            case 'page-search':

                intPageIndex = Number(this.dataset.page) - 1;

                funcManageSelectChange();

                break;

            case 'request-approve':

                const parent = this.closest('[data-pecsid]');

                let pecsid = this.dataset.pecsid;

                let cdid = this.dataset.cdid;

                funcApproveRequest(pecsid, cdid, 1, parent);

                break;

            case 'request-decline':

                const parent2 = this.closest('[data-pecsid]');

                let rejectPecsId = this.dataset.pecsid;

                let rejectCdid = this.dataset.cdid;

                funcApproveRequest(rejectPecsId, rejectCdid, 0, parent2);

                break;

            case 'submit-archive-request':

                console.log("submit");

                funcSubmitArchiveRequest();

                break;

            case 'show-collection':

                const title = this.closest('[data-title]').dataset.title;

                COLLECTIONSEARCH.Open(title);

                break;

            case 'edit-details':

                funcEditDetails.call(this);

                break;

        }

    }

    function funcLoadConnectItems() {

        return new Promise(function (resolve, reject) {

            core.LoadJSON(window.location.origin + "/iapi/ml/connect/recent/").then(function (r) {

                resolve(r);

            }).catch(function (r) {

                reject(r);

            });

        });

    }

    function funcSetupConnectHomepageItems(data) {

        let recentItemContainer = document.getElementById('ConnectRecentItems');

        let frag = document.createDocumentFragment();

        ConnectRecentItems.innerHTML = "";

        let i = 5;

        data.slice(4, 20).forEach(element => {

            let elItem = core.ElementFromHTML('Q:#ConnectRecentItemMarkup'); 

            elItem.dataset.pecsid = element.NumericalPECSID;

            _s(elItem, "rank").innerText = i;

            _s(elItem, "title").innerText = element.Title;

            _s(elItem, "description").innerText = element.Description.length > 150 ? element.Description.substring(0, 150) + "..." : element.Description;

            _s(elItem, "thumbnail").src = element.Image;

            _s(elItem, "channellogo").title = element.Channel;

            _s(elItem, "channellogo").src = element.ChannelLogoUrl;

            if (element.Requested == 1) elItem.classList.add(`${connectitem}--requested`);

            if (element.Requested == 2) elItem.classList.add(`${connectitem}--available`);

            if (element.InList == 1) elItem.classList.add(`${connectitem}--inlist`);

            i++;

            frag.append(elItem);

        });

        recentItemContainer.append(frag);

    }

    function funcSetupConnectBanner(data) {

        let connectBannerContainer = document.querySelector('.connectswiper .swiper-wrapper');

        let frag = document.createDocumentFragment();

        let i = 1;

        data.slice(0, 4).forEach(el => {

            let elItem = core.ElementFromHTML('Q:#ConnectTopItemSlide');

            let strSwiperSlide = "connectswiperslide";

            let useElement = elItem.querySelector(`.${strSwiperSlide}__rank-icon use`);

            useElement.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", `/image/svg/core/coreicons.svg#${i}`);

            elItem.dataset.pecsid = el.NumericalPECSID;

            _s(elItem, "title").innerText = el.Title;

            _s(elItem, "description").innerText = el.Description;

            _s(elItem, "thumbnail").src = el.Image;

            _s(elItem, "ChannelThumbnail").src = el.ChannelLogoUrl;

            _s(elItem, "ChannelThumbnail").title = el.Channel;

            if (el.InList == 1) elItem.classList.add(`${strSwiperSlide}--inlist`);

            if (el.Requested == 1) elItem.classList.add(`${strSwiperSlide}--requested`);

            if (el.Requested == 2) elItem.classList.add(`${strSwiperSlide}--available`);

            if (el.InList == 1) elItem.classList.add(`${strSwiperSlide}--inlist`);

            frag.append(elItem);

            i++;

        });

        connectBannerContainer.append(frag);

        const connectSwiper = new Swiper('.swiper', {
            direction: 'horizontal',
            grabCursor: true,
            speed: 600,
            loop: true,
            slidesPerView: 1,
            spaceBetween: 42,
            navigation: {
                nextEl: `.${strConnectSwiper}-next`,
                prevEl: `.${strConnectSwiper}-prev`,
            },
            pagination: {
                el: `.${strConnectSwiper}__pagination`,
                clickable: true,
                bulletClass: `${strConnectSwiper}__pagination-item`,
                bulletActiveClass: `${strConnectSwiper}__pagination-item--active`,
                renderBullet: function (index, className) {
                    return '<span class="' + className + '">' + (index + 1) + "</span>";
                },
            },
            breakpoints: {
                1400: {
                    slidesPerView: 1.25,
                },
                1600: {
                    slidesPerView: 1.5,
                },
                1800: {
                    slidesPerView: 1.75,
                }

            }

        });

    }

    function funcSubmitArchiveRequest() {

        var strEmail = _s('ar-email').value;

        var strName = _s('ar-name').value;

        var strDetails = _s('ar-request').value;

        if (strName.replace(/ /g, '') == '') {

            alert('Please enter a name');

            return;

        }

        if (strEmail.replace(/ /g, '') == '') {

            alert('Please enter an email address');

            return;

        }

        if (strDetails.replace(/ /g, '') == '') {

            alert('Please enter details of request');

            return;

        }

        core.Ajax(location.pathname + '/SubmitArchiveRequest', {
            name: strName,
            email: strEmail,
            details: strDetails
        }, function (r) {

            TOAST.Show(r.Message);

            modalArchiveRequest.close();

        }, (r) => {



        });

    }

    function funcGetImporList() {

        return new Promise((resolve, reject) => {

            core.LoadJSON(`/iapi/ml/connect/importlist/`).then((r) => {

                arrImportList = r;

                resolve();

            }).catch((r) => {

                TOAST.Err("Error Retrieving Import List");

                reject(r);

            });

        });

    }

    async function funcGetItemsPendingApproval() {

        try {

            let options = {
                pi: intPageIndex,
                ps: 20
            }

            const r = await core.LoadJSON(`/iapi/ml/connect/approval/?f=${JSON.stringify(options)}`);

            objItemsPendingApproval = r;

            arrCurrentPageItems = r.Items;

            return Promise.resolve();

        } catch (error) {

            TOAST.Err("Error Retrieving Approval List");

            return Promise.reject(error);

        }

    }

    function funcRenderApprovalItems() {

        funcGetItemsPendingApproval().then(() => {

            let frag = new DocumentFragment();

            console.log(objItemsPendingApproval);

            if (objItemsPendingApproval.Items?.length) { 

                objItemsPendingApproval.Items.forEach((item) => {

                    let elItem = funcCreateManageListItem(item); // template.content.cloneNode(true);

                    elItem.querySelector(`.${strManageItem}`).classList.add(`${strManageItem}--approve`);

                    frag.append(elItem);

                });

                elManageModalPagination.innerHTML = objItemsPendingApproval.PagerHTML;

                elManageOutput.append(frag);

            } else {

                elManageOutput.innerHTML = `<p class="pestxt pestxt--center">No Items Pending Approval</p>`;

            }

            elManageOutput.classList.remove('loadpanel');



        }).catch((err) => {

            console.log(err);

        });

    }

    async function funcGetItemsAwaitingDownload() {

        try {

            let options = {
                pi: intPageIndex,
                ps: 20
            }

            const r = await core.LoadJSON(`/iapi/ml/connect/requests/?f=${JSON.stringify(options)}`);

            objItemsAwaitingDownload = r;

            arrCurrentPageItems = r.Items;

            return Promise.resolve();

        } catch (error) {

            TOAST.Err("Error Retrieving Download List");

            return Promise.reject(error);

        }

    }

    function funcCreateManageListItem(item) {

        let elItem = template.content.cloneNode(true);

        elItem.querySelector(`.${strManageItem}`).dataset.pecsid = `${item.NumericalPECSID}-${item.ClipDataID}`;

        _s(elItem, 'title').innerText = item.Title;

        _s(elItem, 'desc').innerText = item.Description;

        _s(elItem, 'duration').innerText = core.FormatSecs(item.Duration);

        _s(elItem, 'channel').innerText = item.Channel;

        _s(elItem, 'broadcast').innerText = item.BroadcastDateTime;

        _s(elItem, 'requestedby').innerText = `Request by ${item.RequestedBy}`;

        let arrBtns = elItem.querySelectorAll('[data-cmd]');

        [...arrBtns].forEach((btn) => {

            btn.dataset.pecsid = item.NumericalPECSID;

            btn.dataset.pecs = item.PECSID;

            btn.dataset.cdid = item.ClipDataID;

            btn.dataset.encid = item.EncID;

        });

        return elItem;

    }

    function funcRenderDownloadItems() {

        funcGetItemsAwaitingDownload().then(() => {

            let frag = new DocumentFragment();

            console.log(objItemsAwaitingDownload);

            if (objItemsAwaitingDownload.Items?.length) {

                objItemsAwaitingDownload.Items.forEach((item) => {

                    let elItem = funcCreateManageListItem(item); // template.content.cloneNode(true);

                    elItem.querySelector(`.${strManageItem}`).classList.add(`${strManageItem}--download`);

                    frag.append(elItem);

                });

                elManageModalPagination.innerHTML = objItemsAwaitingDownload.PagerHTML;

                elManageOutput.append(frag);

            } else {

                elManageOutput.innerHTML = `<p class="pestxt pestxt--center">No Items Awaiting Download</p>`;

            }

            elManageOutput.classList.remove('loadpanel');

        }).catch((err) => {

            console.log(err);

        });

    }

    async function funcGetActiveSeriesLinks() {

        try {

            let options = {
                pi: intPageIndex,
                ps: 20
            }

            const r = await core.LoadJSON(`/iapi/ml/connect/series/?f=${JSON.stringify(options)}`);

            objActiveSeriesLinks = r;

            return Promise.resolve();

        } catch (error) {

            TOAST.Err("Error Retrieving Series Links");

            return Promise.reject(error);

        }

    }

    function funcRenderSeriesLinks() {

        funcGetActiveSeriesLinks().then(() => {

            let frag = new DocumentFragment();

            if (objActiveSeriesLinks.length > 0) {

                objActiveSeriesLinks.forEach((item) => {

                    let cItem = template.content.cloneNode(true);

                    cItem.querySelector(`.${strManageItem}`).classList.add(`${strManageItem}--series`);

                    _s(cItem, 'title').innerText = item.Title;

                    frag.append(cItem);

                });

                elManageOutput.append(frag);

            } else {

                elManageOutput.innerHTML = `<p class="pestxt pestxt--center">No Active Series Links</p>`

            }

            elManageOutput.classList.remove('loadpanel');

        })
            .catch((err) => {

                console.log(err);

            });

    }

    function funcConfirmAddToLibrary() {

        funcConfirmAddToLibrary_Start().then((r) => {

            console.log("Create item response", r);

            if (boolImportingMultipleItems) {

                funcConfirmAddMultipleToLibrary_Complete(r);

            } else {

                funcConfirmAddToLibrary_Complete(r);

            }


        }).catch((r) => {

            TOAST.Err(r.Message);

            modalAddItem.isLoading(false);

        });

    }

    function funcGetAllItems() {

        console.log('[CONNECT] Get All Items', arrImportList);

        elUploadFormContainer.setAttribute('class', 'panel__content panel__content--split');

        elUploadFormWrapper.setAttribute('class', 'panel__content-splitcol panel__content-splitcol--nopadding');

        elUploadFormOptions.style.display = '';

        if (arrImportList.length == 1) {

            funcAddItemToLibrary(null, null, arrImportList[0]);

        } else if (arrImportList.length > 1) {

            boolImportingMultipleItems = true;

            funcAddItemToLibrary(null, null, arrImportList[0]);

        } else {

            TOAST.Warn('No items selected to import');

        }

    }

    function funcGetSingleItem() {

        chkCreatePL._cb.Check(false);

        elUploadFormContainer.setAttribute('class', '');

        elUploadFormWrapper.setAttribute('class', '');

        elUploadFormOptions.style.display = 'none';

    }

    function funcAddItemToLibrary(pecsid, pi, _pecsitem, incollection) {

        if (!_pecsitem) {

            if (incollection) {

                objCurrentPECSItem = COLLECTIONSEARCH.GetItem(pecsid, pi);

            } else {

                objCurrentPECSItem = TAS.GetItem(pecsid, pi);

            }

        } else {

            objCurrentPECSItem = _pecsitem;

        }

        //There needs to be a check if the objCurrentPECSItem has a clipdata id > 0
        // if clipdata id > 0 then the item has already been requested

        if (objCurrentPECSItem.ClipDataID > 0) {

            console.log("Item has already been requested");

            return;

        }

        modalAddItem.open();

        modalAddItem.isLoading(true);

        FIELDS.Get(6).then(() => {
            
            let objFormValues = funcGetFreeviewFieldData(objCurrentPECSItem);

            if (!frmMain) {

                frmMain = new UploadForm(document.getElementById('AddMediaForm'), {
                    RecordType: 6,
                    FieldValues: objFormValues.FieldValues,
                    onReady: function () {

                        modalAddItem.isLoading(false);

                        modalAddItem.open();

                    },
                    onCatModalClose: function () {
                        modalAddItem.open();
                    },
                    EnabledOptions: {
                        Location: true,
                        SelectCategory: true,
                        ExpiryDate: APP.UserConfig().CanSetExpiryDate,
                    }
                });

            } else {

                frmMain.setupForm(objFormValues, { RecordType: 6 });

                modalAddItem.isLoading(false);

                modalAddItem.open();

            }

        });

    }

    function funcAddItemFromHomepage() {

        let pecsid = funcGetPECSID(this);

        let elItemToAdd = objPECSHomepageData.filter(o => { return o.NumericalPECSID == pecsid; });

        funcGetSingleItem();

        funcAddItemToLibrary(null, null, elItemToAdd[0]);

    }

    function funcConfirmAddToLibrary_Start() {

        return new Promise((resolve, reject) => {

            let objData = frmMain.getData();

            if (objData.Valid) {

                modalAddItem.isLoading(true);

                let arrCatIDs = [];

                if (objData.Cats) {

                    objData.Cats.forEach(function (c) {

                        arrCatIDs.push(c.ID);

                    });

                }

                let objParams = {

                    type: 6,
                    ppid: objData.PPID,
                    setprivate: objData.Private ? 1 : 0,
                    catsinc: arrCatIDs.join(),
                    fieldvalues: JSON.stringify(objData.FieldValues),
                    era: 1,
                    mode: 'pecs',
                    signagetype: 0,
                    playerid: 0,
                    expiry: objData.ExpiryDate || '',
                    qsuser: ''
                };

                core.Ajax(`${location.pathname}/CreateItem`, objParams, (r) => {

                    resolve(r);

                }, (r) => {

                    reject(r);

                });

            }


        });

    }

    function funcConfirmAddToLibrary_Complete(r) {

        let objCreateitemResponse = r;

        let objParams = {
            pecsid: objCurrentPECSItem.PECSID,
            cs: document.getElementById('hdn_CheckSum').value,
            cdid: r.ClipDataID,
            title: objCurrentPECSItem.Title,
            qsuser: ''
        };

        core.Ajax(`${location.pathname}/AddItem`, objParams, (r) => {

            objCurrentPECSItem.ClipDataID = r.ClipDataID;
            
            if (boolVLEMode){

                VLECALL.Start({
                    RecordType: 6,
                    EncID: objCreateitemResponse.EncID,
                    CS: objCreateitemResponse.VLECallCS,
                    TimelineID: 0,
                    ChapterID: 0
                });

            }

            TOAST.Show(r.Message);

            let elItem = document.querySelector(`.mItem[data-pecsid="${objCurrentPECSItem.NumericalPECSID}"]`);

            if (elItem) elItem.classList.add('mItem--requested');

            modalAddItem.isLoading(false);

            modalAddItem.close();

        }, (r) => {

            reject(r);

        });

    }

    function funcConfirmAddMultipleToLibrary_Complete(r) {

        let numPlaylistID = 0, objCreatePlaylist;

        function funcFinalise() {

            let objParams = {
                items: JSON.stringify(arrImportList),
                cs: document.getElementById('hdn_CheckSum').value,
                cdid: r.ClipDataID,
                plid: numPlaylistID,
                qsuser: ''
            };

            //   Public Shared Function AddMultipleItems(ByVal items As String, ByVal cs As String, ByVal cdid As Integer, ByVal plid As Integer, ByVal qsuser As String) As String

            core.Ajax(`${location.pathname}/AddMultipleItems`, objParams, (r) => {

                objCurrentPECSItem.ClipDataID = r.ClipDataID;

                TOAST.Show(r.Message);

                modalAddItem.isLoading(false);

                modalAddItem.close();

                funcClearAllFromImportList();

            }, (r) => {

                reject(r);

            });

        }

        function funcCreatePlaylist() {

            return new Promise((resolve, reject) => {

                core.Ajax(`${location.pathname}/CreateImportPlaylist`, {
                    title: arrImportList[0].Title
                }, (r) => {

                    resolve(r);

                }, (r) => {

                    reject(r);

                });

            });

        }

        if (chkCreatePL._cb.IsChecked()) {

            funcCreatePlaylist().then((r) => {

                objCreatePlaylist = r;

                numPlaylistID = r.ClipDataID;

                funcFinalise();

            }).catch((r) => {

                funcFinalise();

            });

        } else {

            funcFinalise();

        }


    }

    function funcApproveRequest(pecsid, cdid, approve, el) {

        console.log(el)

        objApproved = {

            pecsid: pecsid,
            cdid: cdid,
            approve: approve

        };

        core.Ajax(location.pathname + '/ApproveRequest', JSON.stringify(objApproved), function (r) {

            if (el) {

                el.classList.add("disabled");

            }

            if (objApproved.approve == 1) {

                TOAST.Show("Request Approved");

            } else if (objApproved.approve == 0) {

                TOAST.Show("Request Declined");

            }

        }, function () { });

    }

    function funcGetFreeviewFieldData(objCurrentPECSItem) {

        let objFormValues = { FieldValues: [] };

        let objReservedFields = FIELDS.GetReservedFields();

        objFormValues.FieldValues.push({
            ID: objReservedFields.TitleFieldID,
            TextValue: objCurrentPECSItem.Title
        });

        objFormValues.FieldValues.push({
            ID: objReservedFields.DescriptionFieldID,
            TextValue: objCurrentPECSItem.Description
        });

        objFormValues.FieldValues.push({
            ID: objReservedFields.BroadcastChannelFieldID,
            TextValue: objCurrentPECSItem.Channel
        });

        objFormValues.FieldValues.push({
            ID: objReservedFields.BroadcastDateFieldID,
            TextValue: objCurrentPECSItem.BroadcastDateTime
        });

        return objFormValues;

    }

    function funcEditDetails() {

        let objCurrentPECSItem = arrCurrentPageItems.filter((i) => {
            return i.NumericalPECSID == this.dataset.pecsid;
        })[0];

        FIELDS.Get(6).then(() => {

            let objFormValues = funcGetFreeviewFieldData(objCurrentPECSItem);

            if (objCurrentPECSItem) {

                modalEditDetails.isLoading(true);

                modalEditDetails.open();

                core.LoadJSON('/iapi/ml/media/' + this.dataset.encid + '/').then((d) => {

                    console.log('[CONNECT] Edit Details > Load Media Data', d);

                    objMediaData = d;

                    var url = '/iAPI/Core/FieldValues/' + objMediaData.ClipDataID + '/';

                    core.LoadJSON(url).then(function (r) {

                        console.log('[CONNECT] Edit Details > Load Field Values', r, objFormValues);

                        let arrFV = objFormValues.FieldValues.concat(r);

                        if (ufEditDetails) {

                            ufEditDetails.setupForm({
                                FieldValues: arrFV,
                                Private: objMediaData.IsPrivate,
                                PPID: objMediaData.PPID
                            },
                                {
                                    RecordType: objMediaData.RecordType,
                                    EncID: objMediaData.EncID,
                                    ClipDataID: objMediaData.ClipDataID,
                                    Private: objMediaData.IsPrivate,
                                    PPID: objMediaData.PPID,
                                });

                        } else {

                            ufEditDetails = new UploadForm(_s(document, 'EditDetailsForm'), {
                                ClipDataID: objMediaData.ClipDataID,
                                EncID: objMediaData.EncID,
                                FieldValues: arrFV,
                                RecordType: objMediaData.RecordType,
                                Private: objMediaData.IsPrivate,
                                PPID: objMediaData.PPID,
                                DefaultToPrivate: objMediaData.IsPrivate,
                                BasicModeOnInit: true,
                                onReady: function () {
                                    modalEditDetails.isLoading(false);
                                },
                                onCatModalClose: function () {
                                    modalEditDetails.open();
                                },
                                EnabledOptions: {
                                    Location: true,
                                    SelectCategory: true,
                                },
                            });

                        }


                    }).catch(function () {


                    });

                });

            }

        });

    }

    function funcConnectItemInfo(el) {

        let pecsid = Number(el.closest(strConnectItem).dataset.pecsid);

        let furtherInfoWrap = document.querySelector('[data-role="connect-further-details"]');

        furtherInfoWrap.classList.add('loadpanel');

        furtherInfoWrap.innerHTML = "";

        pprConnectItemFurtherInfo.updateRef(el);

        pprConnectItemFurtherInfo.open();

        let result = objPECSHomepageData.filter(o => { return o.NumericalPECSID === pecsid; });

        let template = document.getElementById("ConnectItemMetaDataMarkup");

        let bannerItem = template.content.cloneNode(true);

        let frag = document.createDocumentFragment();

        _s(bannerItem, 'meta-title').innerText = result[0].Title;

        _s(bannerItem, 'meta-description').innerText = result[0].Description;

        _s(bannerItem, 'meta-duration').innerText = core.FormatSecs(result[0].Duration);

        _s(bannerItem, 'meta-channel').innerText = result[0].Channel;

        _s(bannerItem, 'meta-requested').innerText = result[0].RequestCount;

        _s(bannerItem, 'meta-broadcast').innerText = result[0].BroadcastDateTime;

        frag.append(bannerItem);

        furtherInfoWrap.append(frag);

        furtherInfoWrap.classList.remove('loadpanel');

    }

    function funcAddItemToImportList() {

        let pecsid = this.closest(strConnectItem).dataset.pecsid;

        let pi = this.closest(strConnectItem).dataset.pageindex;

        let incollection = this.closest(strConnectItem).dataset.incollection;

        let itemToAdd;

        if (!pi) {

            itemToAdd = objPECSHomepageData.filter(o => { return o.NumericalPECSID === Number(pecsid); });

            console.log("Item to add", itemToAdd);

            funcUpdateGetList([itemToAdd[0]]);

            return;

        }

        if(!incollection) {

            itemToAdd = TAS.GetItem(pecsid, pi);

        } else {

            itemToAdd = COLLECTIONSEARCH.GetItem(pecsid, pi);
        }
        
        funcUpdateGetList([itemToAdd]);

    }

    function funcRemoveItemFromImportList() {

        let pecsidtoremove = funcGetPECSID(this);

        const objParams = {

            pecsid: pecsidtoremove

        };

        core.Ajax(location.pathname + '/RemoveItemFromList', objParams, () => {

            let intIndexAt = arrImportList.findIndex((i) => {

                return i.NumericalPECSID == pecsidtoremove;

            });

            if (intIndexAt > -1) {

                arrImportList.splice(intIndexAt, 1);

            }

            document.querySelectorAll(`[data-pecsid="${pecsidtoremove}"]`).forEach((el) => {

                el.classList.remove('connectitem--inlist', 'connectswiperslide--inlist', 'connectimportitem--requested', 'mItem--inlist');

            });

            if (elImportList.childNodes.length == 0) {

                elNoImportItems.style.display = "flex";

            }

            funcRenderImportList();

            TOAST.Show(`Item Removed`);

            console.log(arrImportList);

        }, (r) => {

            console.log(`failed to remove Item ${r}`);

        });

    }

    function funcClearAllFromImportList() {

        let objParams = {};

        core.Ajax(location.pathname + '/ClearList', objParams, () => {

            TOAST.Show("All items removed from list");

            elImportList.innerHTML = "";

            elNoImportItems.style.display = "flex";

            funcRenderImportList();

        }, (r) => {

            console.error('Failed to clear list', r);

        });

    }

    function funcUpdateGetList(arrNew) {

        console.log("ArrNew ", arrNew);

        let arrNewIDs = [];

        arrNew.forEach((x) => {

            // index of the found item is returned to intItemIndex
            let intItemIndex = arrImportList.findIndex((y) => { return y.NumericalPECSID == x.NumericalPECSID; });

            if (intItemIndex >= 0) {

                return;

            } else if (intItemIndex == -1) {

                console.log("New to List");

                arrImportList.push(x);

                arrNewIDs.push(x.NumericalPECSID);

                let objParams = { pecsid: arrNewIDs.join() };

                core.Ajax(location.pathname + '/AddItemToList', objParams, () => {

                    funcRenderImportList();

                    APP.Toast("Import List Updated");

                    var el = document.querySelector(`[data-pecsid="${x.NumericalPECSID}"]`);

                    if (el.classList.contains('connectitem')) {

                        el.classList.add('connectitem--inlist');

                    } else if (el.classList.contains('connectswiperslide')) {

                        el.classList.add('connectswiperslide--inlist');

                    } else if (el.classList.contains('mItem')) {

                        el.classList.add('mItem--inlist');

                    }

                }, (err) => {

                    console.log(err);

                });

            }

        });

    }

    function funcRenderImportList() {
    
        funcGetImporList().then(() => {

            console.log('Import list', arrImportList);

            _s('import-list-counter').innerText = arrImportList.length;

            elImportList.innerHTML = '';

            arrImportList.forEach((i) => {

                let elItem = core.ElementFromHTML('Q:#ImportListItemMarkup');

                elItem.dataset.pecsid = i.NumericalPECSID;

                _s(elItem, 'title').innerText = i.Title;

                _s(elItem, 'thumb').src = i.Image;

                if (i.Requested == 1) {

                    elItem.classList.add('connectimportitem--requested');

                }

                // added to the parent instead of button
                let arrBtns = elItem.querySelectorAll('[data-cmd]');

                [...arrBtns].forEach((btn) => {

                    btn.dataset.pecsid = i.NumericalPECSID;

                });

                elImportList.append(elItem);

            });

            if (arrImportList.length > 0) {

                elNoImportItems.style.display = "none";

            } else {

                elNoImportItems.style.display = "flex";

            }

        });

    }

    function funcManageSelectChange() {

        elManageOutput.innerHTML = "";

        elManageModalPagination.innerHTML = "";

        elManageOutput.classList.add('loadpanel');

        let selectedOption = elSelectManage.value;

        if (selectedOption === "pendingApproval") {

            funcRenderApprovalItems();

        } else if (selectedOption === "awaitingDownload") {

            funcRenderDownloadItems();

        } else if (selectedOption === "activeSeriesLinks") {

            funcRenderSeriesLinks();

        }

    }

    function funcGetPECSID(element) {

        return element.closest(strConnectItem).dataset.pecsid;

    }

    function funcSetSearchMode() {

        elConnectHomepageBtn.style.display = "flex";

        elCoreSubnav.classList.add(strCoreSubnavModifier);

        document.querySelector('.connectpage').classList.add('connectpage--search');

    }

    function funcReturnImportList() {

        return console.log(`Current Import List Length is ${arrImportList.length}`);

    }

    TA.StartModule(funcInit);

    return {
        Init: funcInit,
        SearchMode: funcSetSearchMode,
        renderImportlist: funcRenderImportList,
        ImportListLength: funcReturnImportList,
        GetItemsPendingApproval: funcGetItemsPendingApproval
    };


})(CORE);

