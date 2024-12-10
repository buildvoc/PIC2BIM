import { PageProps, Path, PathFilter } from "@/types";
import { memo, useState, useEffect, useCallback, PropsWithChildren } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import Table from "@/Components/Table/Table";
import { Link } from "@inertiajs/react";
import { FaTrash } from "react-icons/fa";
import Checkbox from "@/Components/Checkbox";
import Map from "@/Components/Map/Map";
import { SplitViewState } from "@/types";
export function Paths({ auth, paths, splitMode }: PageProps) {
    const [paths_, setPaths] = useState<Array<Path>>([]);
    const [splitView, setSplitView] = useState<SplitViewState>({
        split: splitMode ? true : false,
        single: splitMode ? false : true,
    });
    const [filterPaths, setFilterPaths] = useState<PathFilter>({
        data: [],
        filterIds: [],
    });
    useEffect(() => {
        (async () => {
            setPaths(paths);
            if (filterPaths.filterIds.length == 0) {
                setFilterPaths((item: any) => ({ ...item, data: paths }));
            }
        })();
    }, []);

    const toDeviceString = (
        manufacture: string | null,
        model: string | null,
        platform: string | null,
        device_version: string | null
    ) =>
        `${ifNullThenString(manufacture)} ${
            manufacture != null && model != null ? "-" : ""
        }  ${ifNullThenString(model)} ${
            model != null && platform != null ? "-" : ""
        } ${ifNullThenString(platform)} ${
            platform != null && device_version != null ? "-" : ""
        }${ifNullThenString(device_version)}`;
    const ifNullThenString = (data: string | null) => (data ? data : "");



    const LeftPane = useCallback(({filterPaths,setFilterPaths}:PropsWithChildren<{filterPaths:PathFilter,setFilterPaths:any}>) => {
        const handleCheckboxChange = (pathId: any) => {
            if (filterPaths.filterIds.includes(pathId)) {
                let filterIds: any = filterPaths.filterIds.filter(
                    (value) => value != pathId
                );
                let data =
                    filterIds == 0
                        ? paths
                        : filterPaths.data.filter((path: any) => path.id != pathId);
    
                setFilterPaths({ data: data, filterIds: filterIds });
            } else {
                const parmData =
                    filterPaths.filterIds.length == 0 ? [] : filterPaths.data;
                const arrayData = filterPaths.filterIds;
                arrayData.push(pathId);
                const data = paths.filter((path: any) => path.id == pathId);
    
                parmData.push(data[0]);
    
                setFilterPaths((value: any) => {
                    const updateData = {
                        ...value,
                        data: parmData,
                        filterIds: arrayData,
                    };
                    console.log("Updated data ---", updateData)
                    return updateData;
                });
            }
        };
        return (
            <div
                className={`w-full py-2 pl-4 pr-2 ${
                    splitView.split ? "md:w-1/2" : ""
                } `}
            >
                <div className="max-w mx-auto ">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div
                            className={` ${
                                splitView.split ? "h-3/4-screen overflow-y-auto" : ""
                            } `}
                        >
                            <Table
                                columns={[
                                    {
                                        label: "Name",
                                        name: "name",
                                    },
                                    {
                                        label: "Area",
                                        name: "area",
                                    },
                                    {
                                        label: "Path start time",
                                        name: "start",
                                    },
                                    {
                                        label: "Path end time",
                                        name: "end",
                                    },
                                    {
                                        label: "Device",
                                        name: "",
                                        renderCell: (row: Path) => (
                                            <div>
                                                {toDeviceString(
                                                    row.device_manufacture,
                                                    row.device_model,
                                                    row.device_platform,
                                                    row.device_version
                                                )}
                                            </div>
                                        ),
                                    },
                                    {
                                        label: "Show on map",
                                        name: "show",
                                        renderCell: (row: Path) => (
                                            <label className="flex  items-center ">
                                                <Checkbox
                                                    type="checkbox"
                                                    onChange={() =>
                                                        handleCheckboxChange(
                                                            row.id
                                                        )
                                                    }
                                                />
                                            </label>
                                        ),
                                    },
                                    {
                                        label: "Actions",
                                        name: "action",

                                        renderCell: (row: Path) => (
                                            <Link
                                                className="focus:outline-none  flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md ml-3"
                                                href={""}
                                            >
                                                <FaTrash
                                                    size={16}
                                                    className="mr-2"
                                                />
                                                <span>Delete Selected</span>
                                            </Link>
                                        ),
                                    },
                                ]}
                                rows={paths_}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }, [paths_, splitView.split]);

    const RightPane = useCallback(({filterPaths}:PropsWithChildren<{filterPaths:PathFilter}>) => {
        return (
            <div
                className={`w-full py-2 pl-4 pr-2 ${
                    splitView.split ? "md:w-1/2" : ""
                } `}
            >
                <div className="max-w mx-auto ">
                    <Map data={[]} paths={filterPaths.data} className="w-full h-3/4-screen"/>
                </div>
            </div>
        );
    }, [splitView.split]);
    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                    Paths
                </h2>
            }
            setSplitView={setSplitView}
            splitView={splitView}
        >
            <Head title="Paths" />
            <div className="flex flex-wrap ">
                {splitView.split ? (
                    <>
                        <LeftPane filterPaths={filterPaths} setFilterPaths={setFilterPaths}/>
                        <RightPane filterPaths={filterPaths} />
                    </>
                ) : (
                    <>
                        <RightPane filterPaths={filterPaths}/>
                        <LeftPane filterPaths={filterPaths} setFilterPaths={setFilterPaths}/>
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
export default memo(Paths);
