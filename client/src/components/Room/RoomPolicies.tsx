import { MdOutlineRule } from 'react-icons/md';
import { HiOutlineDocumentText } from 'react-icons/hi';
import { RiTimeLine } from 'react-icons/ri';

interface RoomPoliciesProps {
  room: any;
}

const convertTo12HourFormat = (time: string): string => {
  // If already in 12-hour format (contains AM/PM), return as is
  if (time.includes('AM') || time.includes('PM')) {
    return time;
  }

  try {
    // Convert from 24h to 12h format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);

    if (hour === 0) {
      return `12:${minutes} AM`;
    } else if (hour < 12) {
      return `${hour}:${minutes} AM`;
    } else if (hour === 12) {
      return `12:${minutes} PM`;
    } else {
      return `${hour - 12}:${minutes} PM`;
    }
  } catch (error) {
    console.error('Error converting time format:', error);
    return time; // Return original if conversion fails
  }
};

const RoomPolicies = ({ room }: RoomPoliciesProps) => {
  if (!room) return null;

  if (room.type === 'stay') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <RiTimeLine className="mr-2 text-blue-500" />
            Check-in/Check-out
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
            <div className="flex items-start gap-2">
              <span className="font-medium">Check-in:</span>
              <span>
                {convertTo12HourFormat(
                  room.houseRules?.checkInTime || '2:00 PM'
                )}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium">Check-out:</span>
              <span>
                {convertTo12HourFormat(
                  room.houseRules?.checkOutTime || '12:00 PM'
                )}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <HiOutlineDocumentText className="mr-2 text-blue-500" />
            Cancellation Policy
          </h3>
          <p className="text-gray-700 dark:text-gray-300">
            {room.houseRules?.cancellationPolicy ||
              'Free cancellation up to 48 hours before check-in. Cancellations less than 48 hours in advance will be charged 50% of the booking amount.'}
          </p>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <MdOutlineRule className="mr-2 text-blue-500" />
            House Rules
          </h3>
          <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
            {room.houseRules?.additionalRules &&
            room.houseRules.additionalRules.length > 0
              ? room.houseRules.additionalRules.map(
                  (rule: string, index: number) => <li key={index}>{rule}</li>
                )
              : ['No smoking', 'No parties or events', 'No pets'].map(
                  (rule, index) => <li key={index}>{rule}</li>
                )}
          </ul>
        </div>
      </div>
    );
  } else if (room.type === 'conference') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <RiTimeLine className="mr-2 text-blue-500" />
            Booking Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
            <div className="flex items-start gap-2">
              <span className="font-medium">Operating hours:</span>
              <span>
                {convertTo12HourFormat(
                  room.houseRules?.checkInTime || '8:00 AM'
                )}{' '}
                -{' '}
                {convertTo12HourFormat(
                  room.houseRules?.checkOutTime || '8:00 PM'
                )}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <HiOutlineDocumentText className="mr-2 text-blue-500" />
            Cancellation Policy
          </h3>
          <p className="text-gray-700 dark:text-gray-300">
            {room.houseRules?.cancellationPolicy ||
              'Free cancellation up to 24 hours before booking time. Late cancellations will be charged 50% of the booking fee.'}
          </p>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <MdOutlineRule className="mr-2 text-blue-500" />
            Room Rules
          </h3>
          <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
            {room.houseRules?.additionalRules &&
            room.houseRules.additionalRules.length > 0
              ? room.houseRules.additionalRules.map(
                  (rule: string, index: number) => <li key={index}>{rule}</li>
                )
              : [
                  'Keep the space clean',
                  'No loud music',
                  'No food in meeting rooms',
                ].map((rule, index) => <li key={index}>{rule}</li>)}
          </ul>
        </div>
      </div>
    );
  } else if (room.type === 'event') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <RiTimeLine className="mr-2 text-blue-500" />
            Setup and Timing
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
            <div className="flex items-start gap-2">
              <span className="font-medium">Available hours:</span>
              <span>
                {convertTo12HourFormat(
                  room.houseRules?.checkInTime || '8:00 AM'
                )}{' '}
                -{' '}
                {convertTo12HourFormat(
                  room.houseRules?.checkOutTime || '10:00 PM'
                )}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <HiOutlineDocumentText className="mr-2 text-blue-500" />
            Cancellation Policy
          </h3>
          <p className="text-gray-700 dark:text-gray-300">
            {room.houseRules?.cancellationPolicy ||
              'Full refund if cancelled 14 days before the event. 50% refund if cancelled 7 days before. No refund for later cancellations.'}
          </p>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <MdOutlineRule className="mr-2 text-blue-500" />
            Venue Rules
          </h3>
          <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
            {room.houseRules?.additionalRules &&
            room.houseRules.additionalRules.length > 0
              ? room.houseRules.additionalRules.map(
                  (rule: string, index: number) => <li key={index}>{rule}</li>
                )
              : [
                  'No confetti',
                  'No smoking indoors',
                  'Music must end by 10 PM',
                ].map((rule, index) => <li key={index}>{rule}</li>)}
          </ul>
        </div>
      </div>
    );
  }

  return null;
};

export default RoomPolicies;
