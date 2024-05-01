import { View } from "react-native";
import { H3 } from "tamagui";
import { StackedBarChart, XAxis, YAxis, Grid } from "react-native-svg-charts";
import { useEffect, useState } from "react";
import randomColor from "randomcolor";
import {
  isWithinInterval,
  parseISO,
  format,
  addDays,
  subWeeks,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  addWeeks,
  endOfWeek,
  startOfWeek,
} from "date-fns";
import { Text } from "react-native";
import Loading from "../../newfeed/loading";
import { supabase } from "@/lib/supabase";
import useUserID from "@/hooks/auth/useUserID";
import { Image } from "expo-image";
import StyledText from "@/components/styled-text";
import { ChartData } from "@/types/home/stats-type";
import { RecordProps } from "@/hooks/home/statistic/calendar-stats/useDateStats";
import convertWeekToDate from "@/utils/convert-week-format";

type WeekChartProps = ChartData & {
  time: string;
};

const WeekChart = ({ selectedDate }: { selectedDate: Date }) => {
  const [records, setRecords] = useState<RecordProps[]>([]);

  const id = useUserID();

  const [loading, setLoading] = useState(true);

  const [data, setData] = useState<WeekChartProps[]>([]);

  const [colors, setColors] = useState<string[]>([]);

  const [keys, setKeys] = useState<string[]>([]);

  useEffect(() => {
    const getRecordsByWeek = async (date: Date) => {
      setLoading(true);

      const end = endOfWeek(date);
      end.setHours(23, 59, 59, 999);
      const start = startOfWeek(subWeeks(end, 5));
      start.setHours(0, 0, 0, 0);

      const { data: recordData, error } = await supabase
        .from("study_records")
        .select("id, created_at, time, duration, document(title)")
        .eq("user_id", id!)
        .gte("time", start.toISOString())
        .lte("time", end.toISOString());

      if (!error) {
        setRecords(recordData);
      }
      setLoading(false);
    };

    if (selectedDate) {
      getRecordsByWeek(selectedDate);
    }
  }, [selectedDate, id, setRecords]);

  useEffect(() => {
    if (!records || !selectedDate) return;

    const startOfPeriod = startOfWeek(subWeeks(selectedDate, 5));
    startOfPeriod.setHours(0, 0, 0, 0);
    const endOfPeriod = endOfWeek(selectedDate);
    endOfPeriod.setHours(23, 59, 59, 999);

    const allKeys = new Set(
      records
        .map((record) => record.document?.title)
        .filter((title): title is string => !!title)
    );

    const filteredRecords = records.filter((record) =>
      isWithinInterval(parseISO(record?.time!), {
        start: startOfPeriod,
        end: endOfPeriod,
      })
    );

    const groupedByWeek = filteredRecords.reduce(
      (acc: Record<string, ChartData>, record) => {
        const weekStr = format(parseISO(record?.time!), "yyyy-ww");
        if (!acc[weekStr]) {
          acc[weekStr] = {
            date: weekStr,
            totalDuration: 0,
          };
          allKeys.forEach((key) => {
            acc[weekStr][key] = 0;
          });
        }
        acc[weekStr].totalDuration += record.duration;
        const key = record.document?.title;
        if (key) {
          acc[weekStr][key] += record.duration;
        }
        return acc;
      },
      {}
    );

    const chartData = [];
    const uniqueKeys = Array.from(allKeys);
    const colorPalette = uniqueKeys.map((_, index) =>
      randomColor({
        luminosity: index % 2 === 0 ? "light" : "dark",
      })
    );
    for (
      let d = new Date(startOfPeriod);
      d <= endOfPeriod;
      d = addWeeks(d, 1)
    ) {
      const weekStr = format(d, "yyyy-ww");
      if (groupedByWeek[weekStr]) {
        chartData.push(groupedByWeek[weekStr]);
      } else {
        chartData.push({
          date: weekStr,
          time: d.toISOString(),
          totalDuration: 0,
          ...Object.fromEntries(uniqueKeys.map((key) => [key, 0])),
        });
      }
    }

    setData(chartData as any);
    setKeys(uniqueKeys);
    setColors(colorPalette);
  }, [selectedDate, records]);

  return (
    <View className="w-full">
      {loading ? (
        <Loading />
      ) : (
        <View className="px-2">
          <View className="border-emerald-500 rounded-2xl py-2 border">
            {records.length > 0 ? (
              <>
                <View className="w-full px-3 h-[250px]">
                  <View className="h-[250px] flex-1 w-full flex-row items-start">
                    <YAxis
                      numberOfTicks={6}
                      data={data}
                      svg={{
                        fill: "gray",
                        fontSize: 10,
                        fontFamily: "Inter",
                      }}
                      style={{
                        width: 40,
                      }}
                      yAccessor={({ item }: { item: any }) =>
                        item.totalDuration / 60
                      }
                      formatLabel={(value) => `${value}h`}
                      contentInset={{ top: 20, bottom: 20 }}
                    />
                    <StackedBarChart
                      spacingInner={0.3}
                      spacingOuter={0.3}
                      style={{ flex: 1 }}
                      keys={keys}
                      colors={colors}
                      data={data}
                      showGrid={true}
                      contentInset={{ top: 20, bottom: 20 }}
                    >
                      <Grid />
                    </StackedBarChart>
                  </View>
                  <View className=" flex-row w-full pl-[40px]">
                    <XAxis
                      style={{ marginHorizontal: 0, flex: 1 }}
                      data={data}
                      formatLabel={(value, index) => {
                        return convertWeekToDate(data[index].date);
                      }}
                      contentInset={{ left: 20, right: 20 }}
                      svg={{ fontSize: 10, fill: "black", fontFamily: "Inter" }}
                    />
                  </View>
                </View>
                <View className="gap-4 px-[44px] mt-5">
                  {keys.map((value, index) => (
                    <View key={index} className="flex-row gap-6 py-2">
                      <View
                        className="w-[16px] h-[16px] rounded-full"
                        style={{ backgroundColor: colors[index] }}
                      ></View>
                      <Text numberOfLines={1}>{value}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View className="center w-full gap-4 p-3">
                <Image
                  autoplay
                  style={{
                    width: 200,
                    height: 200,
                  }}
                  contentFit="cover"
                  source={require("@/assets/images/stats/pusheen_round.gif")}
                />
                <H3
                  color={"$color8"}
                  mt="8"
                  textAlign="center"
                  textTransform="uppercase"
                >
                  No study record found
                </H3>
                <StyledText
                  color={"$gray10Light"}
                  lineHeight={"$5"}
                  mx="$7"
                  textAlign="center"
                >
                  Look like you haven't recorded any thing on these 6 months
                </StyledText>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

export default WeekChart;
